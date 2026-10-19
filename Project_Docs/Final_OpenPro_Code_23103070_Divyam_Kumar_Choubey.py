"""
models/common.py

Shared building blocks used by both the Encoder and Decoder:
  - ResidualBlock
  - ChannelAttention (Squeeze-Excitation)
  - SpreadSpectrumEmbedding
  - MatchedFilterCorrelation
"""
from __future__ import annotations
import math
import torch
import torch.nn as nn
import torch.nn.functional as F
import numpy as np


# ─────────────────────────────────────────────────────────────────────────────
#  Residual Block  (Conv → BN → ReLU → Conv → BN → skip-add → ReLU)
# ─────────────────────────────────────────────────────────────────────────────
class ResidualBlock(nn.Module):
    """
    Standard pre-activated residual block.
    Input / output shape: (B, C, H, W)
    """
    def __init__(self, channels: int, use_bn: bool = True):
        super().__init__()
        self.conv1 = nn.Conv2d(channels, channels, 3, padding=1, bias=not use_bn)
        self.bn1   = nn.BatchNorm2d(channels) if use_bn else nn.Identity()
        self.conv2 = nn.Conv2d(channels, channels, 3, padding=1, bias=not use_bn)
        self.bn2   = nn.BatchNorm2d(channels) if use_bn else nn.Identity()
        self.act   = nn.ReLU(inplace=True)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        residual = x
        out = self.act(self.bn1(self.conv1(x)))
        out = self.bn2(self.conv2(out))
        return self.act(out + residual)


# ─────────────────────────────────────────────────────────────────────────────
#  Channel Attention (Squeeze-Excitation)
# ─────────────────────────────────────────────────────────────────────────────
class ChannelAttention(nn.Module):
    """
    SE block — adaptively re-weights feature channels.
    Input / output shape: (B, C, H, W)
    """
    def __init__(self, channels: int, reduction: int = 16):
        super().__init__()
        self.pool = nn.AdaptiveAvgPool2d(1)
        mid = max(channels // reduction, 4)
        self.fc = nn.Sequential(
            nn.Flatten(),
            nn.Linear(channels, mid),
            nn.ReLU(inplace=True),
            nn.Linear(mid, channels),
            nn.Sigmoid(),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        scale = self.fc(self.pool(x)).view(x.size(0), x.size(1), 1, 1)
        return x * scale


# ─────────────────────────────────────────────────────────────────────────────
#  Spread-Spectrum Codebook
# ─────────────────────────────────────────────────────────────────────────────
def _make_codebook(bit_length: int, h: int, w: int, seed: int) -> torch.Tensor:
    """
    Returns a fixed random orthonormal pattern bank of shape (bit_length, 1, h, w).
    Each row is an independent pseudo-random carrier pattern, L2-normalised.
    """
    rng = np.random.default_rng(seed)
    codebook = rng.standard_normal((bit_length, h * w)).astype(np.float32)
    # L2-normalise each row
    norms = np.linalg.norm(codebook, axis=1, keepdims=True) + 1e-8
    codebook = (codebook / norms).reshape(bit_length, 1, h, w)
    return torch.from_numpy(codebook)  # (N_bits, 1, H, W)


class SpreadSpectrumEmbedding(nn.Module):
    """
    Embeds a binary payload (±1 bipolar) into a spatial residual pattern using
    a fixed spread-spectrum codebook.

    Forward:
        bits  : (B, N_bits) float32 in {0, 1}
        image : (B, 3, H, W) float32 in [0, 1]
    Returns:
        residual : (B, 3, H, W)  — spatial watermark pattern at image resolution
    """
    def __init__(self, bit_length: int, latent_h: int, latent_w: int, seed: int):
        super().__init__()
        codebook = _make_codebook(bit_length, latent_h, latent_w, seed)
        self.register_buffer("codebook", codebook)   # (N, 1, Hl, Wl)
        self.latent_h = latent_h
        self.latent_w = latent_w

    def forward(self, bits: torch.Tensor, image: torch.Tensor) -> torch.Tensor:
        B, _, H, W = image.shape
        bipolar = bits * 2.0 - 1.0  # (B, N)

        # Aggregate codebook patterns weighted by payload bits
        # einsum: (B,N) × (N,1,Hl,Wl) → (B,1,Hl,Wl)
        pattern = torch.einsum("bn,nchw->bchw", bipolar, self.codebook)

        # Normalise per sample so amplitude is controlled by strength scalar
        std = pattern.std(dim=[1, 2, 3], keepdim=True).clamp_min(1e-6)
        pattern = pattern / std

        # Upsample to image resolution
        pattern = F.interpolate(pattern, size=(H, W), mode="bicubic", align_corners=False)

        # Edge masking: boost watermark near texture regions for perceptual quality
        gray = image.mean(dim=1, keepdim=True)              # (B,1,H,W)
        edges = self._sobel(gray)                            # (B,1,H,W)
        edge_weight = edges / (edges.amax(dim=[2, 3], keepdim=True).clamp_min(1e-6))
        mask = 0.75 + 0.25 * edge_weight                    # in [0.75, 1.0]

        pattern = torch.tanh(pattern) * mask                 # (B,1,H,W)
        return pattern.expand(-1, 3, -1, -1)                 # (B,3,H,W)

    @staticmethod
    def _sobel(x: torch.Tensor) -> torch.Tensor:
        kx = torch.tensor([[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]],
                           dtype=x.dtype, device=x.device).view(1, 1, 3, 3)
        ky = kx.transpose(-1, -2)
        gx = F.conv2d(x, kx, padding=1)
        gy = F.conv2d(x, ky, padding=1)
        return (gx ** 2 + gy ** 2).sqrt()


class MatchedFilterCorrelation(nn.Module):
    """
    Matched-filter detector: correlates image detail with the spread-spectrum
    codebook to recover soft bit logits without any learned weights.

    Forward:
        image : (B, 3, H, W) float32 in [0, 1]
    Returns:
        logits : (B, N_bits)
    """
    def __init__(self, bit_length: int, latent_h: int, latent_w: int, seed: int):
        super().__init__()
        codebook = _make_codebook(bit_length, latent_h, latent_w, seed)
        self.register_buffer("codebook", codebook)   # (N, 1, Hl, Wl)
        self.latent_h = latent_h
        self.latent_w = latent_w

    def forward(self, image: torch.Tensor) -> torch.Tensor:
        # Extract image detail (high-frequency component)
        gray = image.mean(dim=1, keepdim=True)              # (B,1,H,W)
        smooth = F.avg_pool2d(gray, 5, stride=1, padding=2)
        detail = gray - smooth                               # (B,1,H,W)

        # Downsample to codebook resolution
        detail = F.interpolate(detail, size=(self.latent_h, self.latent_w),
                               mode="area")

        # Per-sample zero-mean normalise
        mu = detail.mean(dim=[2, 3], keepdim=True)
        std = detail.std(dim=[2, 3], keepdim=True).clamp_min(1e-6)
        detail = (detail - mu) / std                        # (B,1,Hl,Wl)

        # Dot-product with each codeword: (B,1,Hl,Wl) × (N,1,Hl,Wl) → (B,N)
        logits = torch.einsum("bchw,nchw->bn", detail, self.codebook)  # (B,N)
        return logits

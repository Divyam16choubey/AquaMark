"""
models/encoder.py

AquaMark Encoder:
  Takes  → (cover_image: [B,3,H,W], bits: [B,N], strength: float)
  Returns → {
    "watermarked" : [B,3,H,W],   — watermarked image in [0,1]
    "residual"    : [B,3,H,W],   — signed residual map
  }

Architecture:
  1. Image feature extraction  (stem + 8 residual blocks, 64 ch)
  2. Bit projection            (Dense → Reshape → upsample → 64 ch spatial map)
  3. Fusion                    (concat → conv → 8 residual blocks → 1×1 → 3 ch)
  4. Spread-spectrum residual  (fixed codebook, edged-masked, latent 32×32)
  5. Combined residual         (learned + spread, tanh-clipped, strength-gated)
  6. Watermarked output        (cover + residual, clamped [0,1])
"""
from __future__ import annotations
import torch
import torch.nn as nn
import torch.nn.functional as F

from models.common import ResidualBlock, ChannelAttention, SpreadSpectrumEmbedding


class WatermarkEncoder(nn.Module):
    """
    Robust invisible watermark encoder.

    Tensor shapes (example: B=4, N=64 bits, H=W=256):
      cover_image : (4, 3, 256, 256)
      bits        : (4, 64)
      strength    : scalar in [0.05, 0.45]

    Returns dict:
      watermarked : (4, 3, 256, 256)  — final watermarked image
      residual    : (4, 3, 256, 256)  — signed perturbation applied
    """

    LATENT_RES = 32   # spread-spectrum codebook spatial resolution

    def __init__(
        self,
        image_channels: int = 3,
        watermark_bits: int = 64,
        base_channels: int = 64,
        residual_blocks: int = 8,
        seed: int = 20260325,
    ):
        super().__init__()
        self.watermark_bits = watermark_bits
        self.base_channels = base_channels

        # ── 1. Image Stem ────────────────────────────────────────────────────
        # (B, 3, H, W) → (B, 64, H, W)
        self.image_stem = nn.Sequential(
            nn.Conv2d(image_channels, base_channels, 3, padding=1),
            nn.ReLU(inplace=True),
        )

        # ── 2. Bit Projection ────────────────────────────────────────────────
        # (B, N) → (B, 64, H, W)  — broadcast payload to spatial map
        latent_cells = self.LATENT_RES * self.LATENT_RES
        self.bit_proj = nn.Sequential(
            nn.Linear(watermark_bits, 256),
            nn.ReLU(inplace=True),
            nn.Linear(256, base_channels * latent_cells),
            nn.Tanh(),
        )
        # output reshaped → (B, base_channels, LATENT_RES, LATENT_RES)
        # then upsampled to (B, base_channels, H, W)

        # ── 3. Encoder backbone ──────────────────────────────────────────────
        # (B, 64+64, H, W) → (B, 64, H, W)
        self.fusion_conv = nn.Sequential(
            nn.Conv2d(base_channels * 2, base_channels * 2, 3, padding=1),
            nn.ReLU(inplace=True),
            nn.Conv2d(base_channels * 2, base_channels, 1),
            nn.ReLU(inplace=True),
        )
        self.backbone = nn.Sequential(
            *[ResidualBlock(base_channels) for _ in range(residual_blocks)]
        )
        self.attention = ChannelAttention(base_channels)

        # ── 4. Learned residual projection ───────────────────────────────────
        # (B, 64, H, W) → (B, 3, H, W)
        self.residual_head = nn.Sequential(
            nn.Conv2d(base_channels, base_channels // 2, 3, padding=1),
            nn.ReLU(inplace=True),
            nn.Conv2d(base_channels // 2, image_channels, 1),
            nn.Tanh(),
        )

        # ── 5. Spread-spectrum branch ─────────────────────────────────────────
        self.spread_spectrum = SpreadSpectrumEmbedding(
            bit_length=watermark_bits,
            latent_h=self.LATENT_RES,
            latent_w=self.LATENT_RES,
            seed=seed,
        )

        # ── 6. Blend weights (learnable) ──────────────────────────────────────
        # Controls mix of learned residual vs spread residual
        self.blend = nn.Parameter(torch.tensor([0.6, 0.4]))  # [learned, spread]

    def forward(
        self,
        cover_image: torch.Tensor,    # (B, 3, H, W)  in [0, 1]
        bits: torch.Tensor,           # (B, N)         in {0, 1}
        strength: float = 0.20,
    ) -> dict[str, torch.Tensor]:
        B, C, H, W = cover_image.shape

        # 1. Image features
        img_feat = self.image_stem(cover_image)              # (B, 64, H, W)

        # 2. Bit projection → spatial map
        bit_flat = self.bit_proj(bits)                       # (B, 64*32*32)
        bit_map = bit_flat.view(B, self.base_channels,
                                self.LATENT_RES, self.LATENT_RES)
        bit_map = F.interpolate(bit_map, size=(H, W),
                                mode="bilinear", align_corners=False)  # (B,64,H,W)

        # 3. Fuse + backbone
        fused = self.fusion_conv(torch.cat([img_feat, bit_map], dim=1))
        fused = self.backbone(fused)
        fused = self.attention(fused)

        # 4. Learned residual
        learned_res = self.residual_head(fused)              # (B, 3, H, W) in [-1,1]

        # 5. Spread-spectrum residual
        ss_res = self.spread_spectrum(bits, cover_image)     # (B, 3, H, W)

        # 6. Blend & strength gate
        w = torch.softmax(self.blend, dim=0)
        residual = (w[0] * learned_res + w[1] * ss_res) * strength  # (B,3,H,W)

        # 7. Watermarked image
        watermarked = torch.clamp(cover_image + residual, 0.0, 1.0)

        return {
            "watermarked": watermarked,
            "residual": residual,
        }

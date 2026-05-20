"""
utils/metrics.py  (lightweight inference-only version)

Only includes metrics needed for embedding and verification:
  - PSNR
  - SSIM (differentiable)
  - BER (Bit Error Rate)

Heavy plotting imports (seaborn, matplotlib, sklearn) are removed
to ensure fast cold-start when spawned from Node.js.
"""
from __future__ import annotations
import math
from pathlib import Path

import numpy as np
import torch
import torch.nn.functional as F


# ─────────────────────────────────────────────────────────────────────────────
#  PSNR
# ─────────────────────────────────────────────────────────────────────────────
def psnr(original: torch.Tensor, reconstructed: torch.Tensor) -> float:
    """
    Peak Signal-to-Noise Ratio in dB.
    Inputs: float32 tensors in [0,1], any shape.
    """
    mse = F.mse_loss(original, reconstructed).item()
    if mse < 1e-10:
        return 100.0
    return 10.0 * math.log10(1.0 / mse)


# ─────────────────────────────────────────────────────────────────────────────
#  SSIM (differentiable, window-based)
# ─────────────────────────────────────────────────────────────────────────────
def _gaussian_kernel(size: int = 11, sigma: float = 1.5) -> torch.Tensor:
    coords = torch.arange(size, dtype=torch.float) - size // 2
    g = torch.exp(-(coords ** 2) / (2 * sigma ** 2))
    g /= g.sum()
    return g.outer(g).unsqueeze(0).unsqueeze(0)   # (1,1,size,size)


_SSIM_KERNEL: torch.Tensor | None = None


def ssim(
    img1: torch.Tensor,
    img2: torch.Tensor,
    window_size: int = 11,
    sigma: float = 1.5,
    data_range: float = 1.0,
) -> torch.Tensor:
    """
    Differentiable SSIM.
    Inputs: (B, C, H, W) float32
    Returns: scalar tensor
    """
    global _SSIM_KERNEL
    if _SSIM_KERNEL is None or _SSIM_KERNEL.device != img1.device:
        _SSIM_KERNEL = _gaussian_kernel(window_size, sigma).to(img1.device)

    C1 = (0.01 * data_range) ** 2
    C2 = (0.03 * data_range) ** 2

    channel = img1.size(1)
    kernel = _SSIM_KERNEL.expand(channel, 1, window_size, window_size)

    mu1 = F.conv2d(img1, kernel, padding=window_size//2, groups=channel)
    mu2 = F.conv2d(img2, kernel, padding=window_size//2, groups=channel)
    mu1_sq = mu1 ** 2
    mu2_sq = mu2 ** 2
    mu1_mu2 = mu1 * mu2
    sigma1_sq = F.conv2d(img1 * img1, kernel, padding=window_size//2, groups=channel) - mu1_sq
    sigma2_sq = F.conv2d(img2 * img2, kernel, padding=window_size//2, groups=channel) - mu2_sq
    sigma12   = F.conv2d(img1 * img2, kernel, padding=window_size//2, groups=channel) - mu1_mu2

    ssim_map = ((2*mu1_mu2 + C1) * (2*sigma12 + C2)) / \
               ((mu1_sq + mu2_sq + C1) * (sigma1_sq + sigma2_sq + C2))
    return ssim_map.mean()


def ssim_loss(img1: torch.Tensor, img2: torch.Tensor) -> torch.Tensor:
    """SSIM loss = 1 - SSIM (minimise this)."""
    return 1.0 - ssim(img1, img2)


# ─────────────────────────────────────────────────────────────────────────────
#  BER
# ─────────────────────────────────────────────────────────────────────────────
def compute_ber(
    true_bits: torch.Tensor | np.ndarray,
    pred_probs: torch.Tensor | np.ndarray,
) -> float:
    """
    Bit Error Rate.
    true_bits : float32 {0,1}  shape (B, N) or (N,)
    pred_probs: float32 (0,1)  shape (B, N) or (N,)
    Returns: float in [0, 1]
    """
    if isinstance(true_bits, torch.Tensor):
        true_bits = true_bits.detach().cpu().numpy()
    if isinstance(pred_probs, torch.Tensor):
        pred_probs = pred_probs.detach().cpu().numpy()

    pred_bits = (pred_probs >= 0.5).astype(np.float32)
    return float(np.mean(np.abs(true_bits - pred_bits)))


# ─────────────────────────────────────────────────────────────────────────────
#  Stubs for functions that predict.py imports but doesn't need for inference
# ─────────────────────────────────────────────────────────────────────────────
def save_confusion_matrix(*args, **kwargs):
    """Stub — not available in lightweight inference build."""
    pass

def save_roc_curve(*args, **kwargs):
    """Stub — not available in lightweight inference build."""
    pass

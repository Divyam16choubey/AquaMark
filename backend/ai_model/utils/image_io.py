"""
utils/image_io.py

Image loading, saving, and normalisation utilities.
"""
from __future__ import annotations
from pathlib import Path

import cv2
import numpy as np
import torch
import torch.nn.functional as F
from PIL import Image


def load_image(path: str | Path, size: int | None = None) -> torch.Tensor:
    """
    Load an image from disk.

    Returns: (1, 3, H, W) float32 tensor in [0, 1], RGB channel order.
    """
    img = Image.open(path).convert("RGB")
    if size is not None:
        img = img.resize((size, size), Image.BICUBIC)
    arr = np.array(img, dtype=np.float32) / 255.0          # (H, W, 3)
    t = torch.from_numpy(arr).permute(2, 0, 1).unsqueeze(0)  # (1, 3, H, W)
    return t


def save_image(tensor: torch.Tensor, path: str | Path) -> None:
    """
    Save a (1, 3, H, W) or (3, H, W) float32 [0,1] tensor as PNG.
    """
    if tensor.dim() == 4:
        tensor = tensor.squeeze(0)
    arr = (tensor.detach().cpu().permute(1, 2, 0).numpy() * 255).clip(0, 255).astype(np.uint8)
    img = Image.fromarray(arr, mode="RGB")
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    img.save(path)


def save_residual_visualization(
    residual: torch.Tensor,
    path: str | Path,
    amplify: float = 10.0,
) -> None:
    """
    Save the embedding residual map (amplified for visibility).
    residual: (1, 3, H, W) or (3, H, W) in [-1, 1]
    """
    if residual.dim() == 4:
        residual = residual.squeeze(0)
    amp = (residual * amplify + 0.5).clamp(0, 1)
    save_image(amp.unsqueeze(0), path)


def tensor_to_pil(tensor: torch.Tensor) -> Image.Image:
    """(1,3,H,W) or (3,H,W) float32 [0,1] → PIL Image"""
    if tensor.dim() == 4:
        tensor = tensor.squeeze(0)
    arr = (tensor.cpu().permute(1, 2, 0).numpy() * 255).clip(0, 255).astype(np.uint8)
    return Image.fromarray(arr, "RGB")

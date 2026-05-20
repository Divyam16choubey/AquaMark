"""
inference/embed.py

Inference-time watermark embedding.
Loads a trained encoder checkpoint and embeds a payload into any image.
"""
from __future__ import annotations
import sys
from pathlib import Path

import torch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from config import ModelConfig, DEFAULT_CONFIG
from models.encoder import WatermarkEncoder
from utils.image_io import load_image, save_image, save_residual_visualization
from utils.watermark_bits import text_to_bits
from utils.metrics import psnr, ssim


def embed(
    image_path: str | Path,
    output_path: str | Path,
    watermark_text: str = "AquaMark",
    strength: float | None = None,
    checkpoint: str | Path | None = None,
    cfg: ModelConfig = DEFAULT_CONFIG,
    device: torch.device | None = None,
) -> dict:
    """
    Embed an invisible watermark into an image.

    Args:
        image_path    : path to input image
        output_path   : path to save watermarked image (PNG recommended)
        watermark_text: text payload to embed (hashed to bits)
        strength      : embedding strength [0.05, 0.45]. None = config default
        checkpoint    : path to checkpoint .pt file. None = auto from cfg
        cfg           : model configuration
        device        : torch.device. None = auto-detect

    Returns:
        dict with "psnr", "ssim", "strength", "bits_hex", "output_path"
    """
    if device is None:
        device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

    # ── Load model ─────────────────────────────────────────────────────────────
    encoder = WatermarkEncoder(
        image_channels=cfg.image_channels,
        watermark_bits=cfg.watermark_bits,
        base_channels=cfg.enc_base_channels,
        residual_blocks=cfg.enc_residual_blocks,
        seed=cfg.default_seed,
    ).to(device).eval()

    ckpt_path = Path(checkpoint) if checkpoint else (cfg.checkpoint_dir / "checkpoint_best.pt")
    if ckpt_path.exists():
        ckpt = torch.load(ckpt_path, map_location=device)
        encoder.load_state_dict(ckpt["encoder"])
        print(f"[Embed] Loaded checkpoint: {ckpt_path}")
    else:
        print(f"[Embed] WARNING: No checkpoint found at {ckpt_path}. "
              "Using untrained encoder (watermark will not be robust).")

    # ── Load image ─────────────────────────────────────────────────────────────
    image = load_image(image_path).to(device)   # (1, 3, H, W)
    _, _, H, W = image.shape

    # ── Prepare bits ───────────────────────────────────────────────────────────
    bits_np = text_to_bits(watermark_text, cfg.watermark_bits)
    bits    = torch.from_numpy(bits_np).unsqueeze(0).to(device)  # (1, N)

    s = strength if strength is not None else cfg.default_strength

    # ── Embed ─────────────────────────────────────────────────────────────────
    with torch.no_grad():
        enc_out = encoder(image, bits, s)

    watermarked = enc_out["watermarked"]   # (1, 3, H, W)
    residual    = enc_out["residual"]

    # ── Save ─────────────────────────────────────────────────────────────────
    out_path = Path(output_path)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    save_image(watermarked, out_path)

    residual_path = out_path.parent / (out_path.stem + "_residual.png")
    save_residual_visualization(residual, residual_path)

    # ── Compute metrics ────────────────────────────────────────────────────────
    p = psnr(image, watermarked)
    s_val = float(ssim(image, watermarked))

    from utils.watermark_bits import bits_to_readable
    bits_hex = bits_to_readable(bits_np)

    result = {
        "output_path":   str(out_path),
        "residual_path": str(residual_path),
        "psnr_db":       round(p, 2),
        "ssim":          round(s_val, 5),
        "strength":      s,
        "bits_hex":      bits_hex[:16] + "...",
        "watermark_text": watermark_text,
    }
    print(f"[Embed] Done  PSNR={p:.2f} dB  SSIM={s_val:.4f}  -> {out_path}")
    return result

"""
inference/verify.py

Inference-time watermark verification.
Loads the trained decoder and analyses a suspect image.

Output:
{
  "status"     : "SAFE" | "CORRUPTED" | "ABSENT",
  "confidence" : float (0-100 %),
  "ber"        : float (0-1),
  "psnr"       : float (dB, requires original if provided),
  "ssim"       : float (requires original),
  "integrity_probs": {"ABSENT": float, "SAFE": float, "CORRUPTED": float},
  "bits_hex"   : str,
}
"""
from __future__ import annotations
import sys
from pathlib import Path
from typing import Optional

import numpy as np
import torch
import torch.nn.functional as F

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from config import ModelConfig, DEFAULT_CONFIG
from models.decoder import WatermarkDecoder
from utils.image_io import load_image, save_image
from utils.watermark_bits import text_to_bits, bits_to_readable
from utils.metrics import compute_ber, psnr, ssim


def verify(
    suspect_path: str | Path,
    watermark_text: str = "AquaMark",
    original_path: Optional[str | Path] = None,
    checkpoint: str | Path | None = None,
    cfg: ModelConfig = DEFAULT_CONFIG,
    device: torch.device | None = None,
    save_recovered: Optional[str | Path] = None,
) -> dict:
    """
    Verify whether a suspect image carries the expected watermark.

    Args:
        suspect_path  : path to the image to analyse
        watermark_text: expected watermark payload
        original_path : optional original image for PSNR/SSIM comparison
        checkpoint    : path to .pt checkpoint. None = auto from cfg
        cfg           : model configuration
        device        : torch device (None = auto)
        save_recovered: if given, save a visualisation of recovered bits

    Returns:
        dict with status, confidence, ber, integrity_probs, etc.
    """
    if device is None:
        device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

    # ── Load decoder ──────────────────────────────────────────────────────────
    decoder = WatermarkDecoder(
        image_channels=cfg.image_channels,
        watermark_bits=cfg.watermark_bits,
        base_channels=cfg.dec_base_channels,
        residual_blocks=cfg.dec_residual_blocks,
        seed=cfg.default_seed,
    ).to(device).eval()

    ckpt_path = Path(checkpoint) if checkpoint else (cfg.checkpoint_dir / "checkpoint_best.pt")
    if ckpt_path.exists():
        ckpt = torch.load(ckpt_path, map_location=device)
        decoder.load_state_dict(ckpt["decoder"])
        print(f"[Verify] Loaded checkpoint: {ckpt_path}")
    else:
        print(f"[Verify] WARNING: No checkpoint at {ckpt_path}. Using untrained decoder.")

    # ── Load suspect image ────────────────────────────────────────────────────
    suspect = load_image(suspect_path).to(device)   # (1, 3, H, W)

    # ── Decode ────────────────────────────────────────────────────────────────
    with torch.no_grad():
        dec_out = decoder(suspect)

    bit_probs        = dec_out["bit_probs"].squeeze(0).cpu().numpy()     # (N,)
    integrity_probs  = dec_out["integrity_probs"].squeeze(0).cpu().numpy()  # (3,)

    # ── Expected bits ────────────────────────────────────────────────────────
    expected_bits = text_to_bits(watermark_text, cfg.watermark_bits)     # (N,)

    # ── BER ───────────────────────────────────────────────────────────────────
    ber = compute_ber(expected_bits, bit_probs)

    # ── Status ───────────────────────────────────────────────────────────────
    absent_prob     = float(integrity_probs[0])
    safe_prob       = float(integrity_probs[1])
    corrupted_prob  = float(integrity_probs[2])
    presence_score  = safe_prob + corrupted_prob

    # Blend heuristic BER with neural classifier
    ber_heuristic = max(0.0, 1.0 - ber / 0.5)
    blended_presence = 0.60 * ber_heuristic + 0.40 * presence_score

    if ber >= cfg.absent_ber and blended_presence < 0.45:
        status = "ABSENT"
    elif ber <= cfg.safe_ber:
        status = "SAFE"
    else:
        status = "CORRUPTED"

    confidence = round(float(
        max(absent_prob if status == "ABSENT" else (safe_prob if status == "SAFE" else corrupted_prob),
            blended_presence if status != "ABSENT" else absent_prob)
    ) * 100, 2)

    # ── Optional quality metrics (requires original) ───────────────────────
    p_val = None
    s_val = None
    if original_path:
        original = load_image(original_path).to(device)
        # Resize suspect to match if needed
        if suspect.shape != original.shape:
            suspect_r = F.interpolate(suspect, size=original.shape[2:],
                                      mode="bilinear", align_corners=False)
        else:
            suspect_r = suspect
        p_val = round(psnr(original, suspect_r), 2)
        s_val = round(float(ssim(original, suspect_r)), 5)

    # ── Recovered bits visualisation ─────────────────────────────────────────
    pred_bits  = (bit_probs >= 0.5).astype(np.float32)
    bits_hex   = bits_to_readable(pred_bits)
    exp_hex    = bits_to_readable(expected_bits)

    result = {
        "status":     status,
        "confidence": confidence,
        "ber":        round(ber, 5),
        "integrity_probs": {
            "ABSENT":    round(absent_prob, 4),
            "SAFE":      round(safe_prob, 4),
            "CORRUPTED": round(corrupted_prob, 4),
        },
        "decoded_bits_hex":  bits_hex[:16] + "...",
        "expected_bits_hex": exp_hex[:16]  + "...",
        "watermark_text":    watermark_text,
    }
    if p_val is not None:
        result["psnr_db"] = p_val
        result["ssim"]    = s_val

    print(
        f"[Verify]  Status={status}  confidence={confidence:.1f}%  "
        f"BER={ber:.4f}  "
        + (f"PSNR={p_val} dB  SSIM={s_val}" if p_val else "")
    )
    return result

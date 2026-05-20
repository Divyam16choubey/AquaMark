"""
predict.py  —  AquaMark AI Watermark Verification
============================================================
Verify whether a suspect image carries an authentic watermark.
Also supports embedding mode.

Usage:
  # Verify a suspect image:
  python predict.py verify path/to/suspect.jpg

  # Verify with known original for PSNR/SSIM:
  python predict.py verify suspect.jpg --original original.jpg

  # Embed watermark into an image:
  python predict.py embed path/to/image.jpg --output watermarked.png

  # Custom watermark text:
  python predict.py verify suspect.jpg --text "MyCompany2024"

  # Test all attacks on a watermarked image:
  python predict.py attack-test watermarked.png

Output JSON:
  {
    "status"     : "SAFE" | "CORRUPTED" | "ABSENT",
    "confidence" : 92.4,
    "ber"        : 0.031,
    "psnr"       : 41.2,
    "ssim"       : 0.9987,
    "integrity_probs": {"ABSENT": 0.02, "SAFE": 0.94, "CORRUPTED": 0.04}
  }
============================================================
"""
from __future__ import annotations
import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from config import DEFAULT_CONFIG
from inference.embed import embed
from inference.verify import verify
from attacks.simulator import AttackSimulator
from utils.image_io import load_image, save_image
from utils.metrics import psnr, ssim, save_confusion_matrix, save_roc_curve
import torch
import numpy as np


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(
        description="AquaMark — Watermark Embedding & Verification",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )
    sub = p.add_subparsers(dest="command", required=True)

    # ── verify ────────────────────────────────────────────────────────────────
    v = sub.add_parser("verify", help="Verify watermark in a suspect image.")
    v.add_argument("image",       help="Path to suspect image.")
    v.add_argument("--original",  default=None,
                   help="Path to original image (for PSNR/SSIM).")
    v.add_argument("--text",      default="AquaMark",
                   help="Expected watermark text.")
    v.add_argument("--checkpoint",default=None)
    v.add_argument("--output",    default=None,
                   help="Path to save JSON result.")

    # ── embed ─────────────────────────────────────────────────────────────────
    e = sub.add_parser("embed", help="Embed invisible watermark into an image.")
    e.add_argument("image",       help="Path to cover image.")
    e.add_argument("--output",    default="outputs/watermarked.png",
                   help="Output path for watermarked image.")
    e.add_argument("--text",      default="AquaMark",
                   help="Watermark text payload.")
    e.add_argument("--strength",  type=float, default=None,
                   help="Embedding strength (0.05-0.45).")
    e.add_argument("--checkpoint",default=None)

    # ── attack-test ───────────────────────────────────────────────────────────
    a = sub.add_parser("attack-test",
                       help="Run all attacks on a watermarked image and verify each.")
    a.add_argument("image",       help="Path to watermarked image.")
    a.add_argument("--text",      default="AquaMark")
    a.add_argument("--checkpoint",default=None)
    a.add_argument("--output-dir",default="outputs/attack_test")

    return p.parse_args()


def cmd_verify(args) -> None:
    result = verify(
        suspect_path   = args.image,
        watermark_text = args.text,
        original_path  = args.original,
        checkpoint     = args.checkpoint,
    )
    print("\n" + "=" * 50)
    print("  WATERMARK VERIFICATION RESULT")
    print("=" * 50)
    for k, v in result.items():
        if isinstance(v, dict):
            print(f"  {k}:")
            for kk, vv in v.items():
                print(f"    {kk}: {vv}")
        else:
            print(f"  {k}: {v}")
    print("=" * 50)

    if args.output:
        Path(args.output).parent.mkdir(parents=True, exist_ok=True)
        Path(args.output).write_text(json.dumps(result, indent=2))
        print(f"[predict] JSON saved → {args.output}")


def cmd_embed(args) -> None:
    result = embed(
        image_path     = args.image,
        output_path    = args.output,
        watermark_text = args.text,
        strength       = args.strength,
        checkpoint     = args.checkpoint,
    )
    print("\n[Embed Result]")
    for k, v in result.items():
        print(f"  {k}: {v}")


def cmd_attack_test(args) -> None:
    """
    Run every individual attack against a watermarked image, then verify each.
    Generates a summary table + saves per-attack results to JSON.
    """
    sim = AttackSimulator(seed=DEFAULT_CONFIG.default_seed)
    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    image = load_image(args.image).to(device)

    attacks_to_test = [a for a in AttackSimulator.ALL_ATTACKS if a != "combined"]
    results = []

    print(f"\n[AttackTest] Testing {len(attacks_to_test)} attacks on: {args.image}")
    print("-" * 70)
    print(f"{'Attack':<30}  {'Status':<12}  {'BER':>6}  {'Conf':>7}  {'Sev':>6}")
    print("-" * 70)

    for attack_name in attacks_to_test:
        attacked, meta = sim.apply_single(image, attack_name)

        att_path = output_dir / f"attacked_{attack_name}.png"
        save_image(attacked, att_path)

        v = verify(
            suspect_path   = att_path,
            watermark_text = args.text,
            original_path  = args.image,
            checkpoint     = args.checkpoint,
        )
        v["attack"]   = attack_name
        v["severity"] = meta.severity
        results.append(v)

        print(f"  {attack_name:<28}  {v['status']:<12}  "
              f"{v['ber']:>6.4f}  {v['confidence']:>6.1f}%  {meta.severity:>5.2f}")

    print("-" * 70)
    summary_path = output_dir / "attack_test_results.json"
    summary_path.write_text(json.dumps(results, indent=2))
    print(f"\n[AttackTest] Results saved → {summary_path}")

    # Count outcomes
    safe_count = sum(1 for r in results if r["status"] == "SAFE")
    print(f"\n[AttackTest] SAFE: {safe_count}/{len(results)}  "
          f"({safe_count/len(results)*100:.0f}% watermark survived)")


def main() -> None:
    args = parse_args()
    if args.command == "verify":
        cmd_verify(args)
    elif args.command == "embed":
        cmd_embed(args)
    elif args.command == "attack-test":
        cmd_attack_test(args)


if __name__ == "__main__":
    main()

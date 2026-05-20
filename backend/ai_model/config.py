"""
Configuration: All hyperparameters, paths, and model settings for AquaMark AI.
"""
from __future__ import annotations
import os
from dataclasses import dataclass, field, asdict
from pathlib import Path
import yaml

ROOT = Path(__file__).resolve().parent


@dataclass
class ModelConfig:
    # ── Image / Payload ─────────────────────────────────────
    image_size: int = 256           # Training crop size (H = W)
    watermark_bits: int = 64        # Bits in payload vector
    image_channels: int = 3         # RGB

    # ── Encoder ─────────────────────────────────────────────
    enc_base_channels: int = 64
    enc_residual_blocks: int = 8
    enc_spread_spectrum_seeds: int = 4   # multi-seed spread spectrum

    # ── Decoder ─────────────────────────────────────────────
    dec_base_channels: int = 64
    dec_residual_blocks: int = 6

    # ── Training ─────────────────────────────────────────────
    batch_size: int = 8
    learning_rate: float = 1e-4
    weight_decay: float = 1e-5
    epochs: int = 80
    warmup_epochs: int = 5
    mixed_precision: bool = True

    # ── Loss weights ─────────────────────────────────────────
    lambda_image_mse: float = 5.0
    lambda_image_ssim: float = 3.0
    lambda_perceptual: float = 1.0
    lambda_bits: float = 8.0
    lambda_bits_attacked: float = 6.0
    lambda_integrity: float = 2.0

    # ── Embedding ────────────────────────────────────────────
    default_strength: float = 0.20   # max residual amplitude

    # ── BER thresholds ───────────────────────────────────────
    safe_ber: float = 0.15
    absent_ber: float = 0.45

    # ── Scheduler ────────────────────────────────────────────
    lr_scheduler: str = "cosine"     # "cosine" | "step"
    lr_step_size: int = 20
    lr_gamma: float = 0.5

    # ── Dataset ──────────────────────────────────────────────
    dataset: str = "cifar10"        # "cifar10" | "div2k"
    num_workers: int = 4
    val_split: float = 0.1

    # ── Checkpoint / logging ─────────────────────────────────
    save_every: int = 5              # save checkpoint every N epochs
    log_every: int = 50             # log batch metrics every N steps
    default_seed: int = 20260325

    # ── Paths ─────────────────────────────────────────────────
    checkpoint_dir: Path = ROOT / "checkpoints"
    log_dir: Path = ROOT / "logs"
    output_dir: Path = ROOT / "outputs"
    dataset_dir: Path = ROOT / "dataset"

    def ensure_dirs(self) -> None:
        for d in [self.checkpoint_dir, self.log_dir, self.output_dir, self.dataset_dir]:
            d.mkdir(parents=True, exist_ok=True)

    def to_dict(self) -> dict:
        d = asdict(self)
        return {k: str(v) if isinstance(v, Path) else v for k, v in d.items()}

    @classmethod
    def from_yaml(cls, path: str | Path) -> "ModelConfig":
        with open(path, "r") as f:
            data = yaml.safe_load(f)
        obj = cls()
        for k, v in data.items():
            if hasattr(obj, k):
                if k.endswith("_dir") and isinstance(v, str):
                    setattr(obj, k, Path(v))
                else:
                    setattr(obj, k, v)
        return obj

    def save_yaml(self, path: str | Path) -> None:
        with open(path, "w") as f:
            yaml.dump(self.to_dict(), f, default_flow_style=False)


DEFAULT_CONFIG = ModelConfig()

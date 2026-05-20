"""
utils/watermark_bits.py

Watermark payload encoding/decoding helpers.
"""
from __future__ import annotations
import hashlib
import numpy as np
import torch


def text_to_bits(text: str, bit_length: int = 64) -> np.ndarray:
    """
    Encode a text string into a fixed-length binary vector via SHA-256.

    Returns np.ndarray of shape (bit_length,) with dtype float32 in {0, 1}.
    """
    digest = hashlib.sha256(text.encode("utf-8")).digest()
    # Expand bytes to bits
    bits = np.unpackbits(np.frombuffer(digest, dtype=np.uint8))
    # Truncate or repeat to fill bit_length
    if len(bits) >= bit_length:
        return bits[:bit_length].astype(np.float32)
    repeats = (bit_length // len(bits)) + 1
    return np.tile(bits, repeats)[:bit_length].astype(np.float32)


def bits_to_readable(bits: np.ndarray | torch.Tensor) -> str:
    """Convert a bit array to a compact hex string for display."""
    if isinstance(bits, torch.Tensor):
        bits = bits.detach().cpu().numpy()
    bits_int = bits.astype(np.uint8).flatten()
    # Pad to multiple of 8
    pad = (8 - len(bits_int) % 8) % 8
    bits_int = np.pad(bits_int, (0, pad))
    byte_array = np.packbits(bits_int)
    return byte_array.tobytes().hex()


def random_bit_vectors(batch_size: int, bit_length: int, seed: int | None = None) -> torch.Tensor:
    """Generate random binary payload vectors for training."""
    rng = np.random.default_rng(seed)
    bits = rng.integers(0, 2, size=(batch_size, bit_length)).astype(np.float32)
    return torch.from_numpy(bits)


def compute_bit_accuracy(
    true_bits: torch.Tensor,
    pred_probs: torch.Tensor,
) -> float:
    """Fraction of bits correctly recovered."""
    pred = (pred_probs >= 0.5).float()
    return float((pred == true_bits).float().mean())

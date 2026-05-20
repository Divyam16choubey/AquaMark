"""
models/decoder.py

AquaMark Decoder:
  Takes  → (suspect_image: [B, 3, H, W])
  Returns → {
    "bit_logits"            : [B, N_bits],
    "bit_probs"             : [B, N_bits],   — sigmoid probabilities
    "integrity_logits"      : [B, 3],
    "integrity_probs"       : [B, 3],        — softmax [ABSENT, SAFE, CORRUPTED]
    "ber_estimate"          : scalar,
  }

Architecture:
  ┌─ A. CNN Descriptor branch ─────────────────────────────────────────┐
  │  stem (64) → down×3 (96→128→192) → GlobalAvgPool → dense(256)     │
  │  → learned bit logits (N_bits)                                     │
  └────────────────────────────────────────────────────────────────────┘
  ┌─ B. Matched-Filter branch (no weights) ────────────────────────────┐
  │  Correlate image detail with spread-spectrum codebook              │
  │  → raw logits (N_bits)                                             │
  └────────────────────────────────────────────────────────────────────┘
  Fused logits = 0.35 * CNN_logits + 0.65 * MF_logits

  ┌─ C. Integrity Classifier ──────────────────────────────────────────┐
  │  [CNN_feat | bit_probs | bit_margin | mf_strength] → Linear(3)    │
  └────────────────────────────────────────────────────────────────────┘
"""
from __future__ import annotations
import torch
import torch.nn as nn
import torch.nn.functional as F

from models.common import ResidualBlock, ChannelAttention, MatchedFilterCorrelation


class WatermarkDecoder(nn.Module):
    """
    Tensor shapes (example: B=4, N=64 bits, H=W=256):
      suspect_image : (4, 3, 256, 256)

    Output dict:
      bit_logits        : (4, 64)
      bit_probs         : (4, 64)
      integrity_logits  : (4, 3)
      integrity_probs   : (4, 3)   ← softmax over [ABSENT, SAFE, CORRUPTED]
    """

    LATENT_RES = 32
    LABEL_ABSENT    = 0
    LABEL_SAFE      = 1
    LABEL_CORRUPTED = 2

    def __init__(
        self,
        image_channels: int = 3,
        watermark_bits: int = 64,
        base_channels: int = 64,
        residual_blocks: int = 6,
        seed: int = 20260325,
    ):
        super().__init__()
        self.watermark_bits = watermark_bits

        # ── A. CNN Descriptor backbone ───────────────────────────────────────
        # (B,3,H,W) → (B, 192, H/8, W/8)
        self.stem = nn.Sequential(
            nn.Conv2d(image_channels, base_channels, 3, padding=1),
            nn.ReLU(inplace=True),
        )
        self.down1 = nn.Sequential(
            nn.Conv2d(base_channels, base_channels * 3 // 2, 3, stride=2, padding=1),
            nn.ReLU(inplace=True),
            *[ResidualBlock(base_channels * 3 // 2) for _ in range(2)],
            ChannelAttention(base_channels * 3 // 2),
        )  # → (B, 96, H/2, W/2)
        self.down2 = nn.Sequential(
            nn.Conv2d(base_channels * 3 // 2, base_channels * 2, 3, stride=2, padding=1),
            nn.ReLU(inplace=True),
            *[ResidualBlock(base_channels * 2) for _ in range(2)],
            ChannelAttention(base_channels * 2),
        )  # → (B, 128, H/4, W/4)
        self.down3 = nn.Sequential(
            nn.Conv2d(base_channels * 2, base_channels * 3, 3, stride=2, padding=1),
            nn.ReLU(inplace=True),
            *[ResidualBlock(base_channels * 3) for _ in range(residual_blocks)],
            ChannelAttention(base_channels * 3),
        )  # → (B, 192, H/8, W/8)

        desc_dim = base_channels * 3  # 192
        self.pool = nn.AdaptiveAvgPool2d(1)
        self.descriptor = nn.Sequential(
            nn.Flatten(),
            nn.Linear(desc_dim, 256),
            nn.ReLU(inplace=True),
            nn.Dropout(0.15),
        )  # → (B, 256)

        # Learned bit head (CNN)
        self.cnn_bit_head = nn.Linear(256, watermark_bits)

        # ── B. Matched Filter branch ─────────────────────────────────────────
        self.matched_filter = MatchedFilterCorrelation(
            bit_length=watermark_bits,
            latent_h=self.LATENT_RES,
            latent_w=self.LATENT_RES,
            seed=seed,
        )
        self.mf_scale = nn.Parameter(torch.tensor(0.65))   # learnable blend weight

        # ── C. Integrity Classifier ───────────────────────────────────────────
        # Input: [desc(256) | bit_probs(N) | bit_margin(1) | mf_strength(1)]
        integrity_in = 256 + watermark_bits + 1 + 1
        self.integrity_head = nn.Sequential(
            nn.Linear(integrity_in, 256),
            nn.ReLU(inplace=True),
            nn.Dropout(0.1),
            nn.Linear(256, 128),
            nn.ReLU(inplace=True),
            nn.Linear(128, 3),
        )

    def forward(self, suspect_image: torch.Tensor) -> dict[str, torch.Tensor]:
        B = suspect_image.size(0)

        # ── A. CNN backbone ───────────────────────────────────────────────────
        x = self.stem(suspect_image)
        x = self.down1(x)
        x = self.down2(x)
        x = self.down3(x)
        pooled = self.pool(x)                           # (B, 192, 1, 1)
        desc = self.descriptor(pooled)                  # (B, 256)
        cnn_logits = self.cnn_bit_head(desc)            # (B, N)

        # ── B. Matched filter ─────────────────────────────────────────────────
        mf_logits = self.matched_filter(suspect_image)  # (B, N)
        mf_strength = mf_logits.abs().mean(dim=1, keepdim=True)  # (B, 1)

        # Fuse: CNN contrib (1 - mf_scale), MF contrib mf_scale
        alpha = torch.sigmoid(self.mf_scale)
        bit_logits = (1.0 - alpha) * cnn_logits + alpha * mf_logits  # (B, N)

        # ── Bit probabilities & margin ────────────────────────────────────────
        bit_probs  = torch.sigmoid(bit_logits)          # (B, N)  in (0,1)
        bit_margin = (bit_probs - 0.5).abs().mean(dim=1, keepdim=True) * 2.0  # (B,1)

        # ── C. Integrity classification ───────────────────────────────────────
        integrity_feat = torch.cat([desc, bit_probs, bit_margin, mf_strength], dim=1)
        integrity_logits = self.integrity_head(integrity_feat)   # (B, 3)
        integrity_probs  = torch.softmax(integrity_logits, dim=1)

        return {
            "bit_logits":       bit_logits,
            "bit_probs":        bit_probs,
            "integrity_logits": integrity_logits,
            "integrity_probs":  integrity_probs,
        }

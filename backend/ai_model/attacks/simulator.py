"""
attacks/simulator.py

Full Attack Simulation Pipeline — all attacks implemented with real OpenCV /
kornia transforms. Applied dynamically during training (random selection each
step) and available for standalone evaluation.

Supported attacks:
  1.  jpeg_compression       — variable quality 20-90
  2.  crop                   — 65-96 % area, resize back
  3.  resize                 — down then up (0.45-0.90 scale)
  4.  rotation               — ±15 degrees, reflect border
  5.  gaussian_blur          — k ∈ {3,5,7,9}, σ random
  6.  gaussian_noise         — σ ∈ [0.01, 0.06]
  7.  brightness             — ±0.30 additive shift
  8.  contrast               — ×[0.70, 1.35]
  9.  perspective_warp       — 4-corner random shift ≤5 %
  10. screenshot_simulation  — warp + gamma + moire + jpeg
  11. social_media           — double JPEG + resize chain
  12. median_filter          — 3×3 / 5×5 median spatial filter
  13. sharpen               — unsharp-mask sharpening
  14. identity              — no-op (clean baseline)
  15. combined              — random 2-3 attack chain

All images are expected as:
  torch.Tensor  float32  (B, 3, H, W)  in [0, 1]  RGB
"""
from __future__ import annotations
import random
import math
from dataclasses import dataclass
from typing import Optional

import cv2
import numpy as np
import torch
import torch.nn.functional as F


# ─────────────────────────────────────────────────────────────────────────────
@dataclass
class AttackMeta:
    name: str
    severity: float   # 0.0 (none) → 1.0 (maximal)


# ─────────────────────────────────────────────────────────────────────────────
#  Utility: Tensor ↔ NumPy
# ─────────────────────────────────────────────────────────────────────────────
def _t2np(t: torch.Tensor) -> np.ndarray:
    """(B,3,H,W) float32 [0,1] → (B,H,W,3) uint8"""
    return (t.cpu().permute(0, 2, 3, 1).numpy() * 255).clip(0, 255).astype(np.uint8)

def _np2t(a: np.ndarray, device: torch.device) -> torch.Tensor:
    """(B,H,W,3) uint8 → (B,3,H,W) float32 [0,1]"""
    return torch.from_numpy(a).float().permute(0, 3, 1, 2).div(255.0).to(device)


# ─────────────────────────────────────────────────────────────────────────────
class AttackSimulator:
    """
    Apply one randomly chosen attack to a batch of images each training step.

    Usage:
        sim = AttackSimulator(seed=42)
        attacked, meta_list = sim.apply_batch(watermarked_tensor)
    """

    ALL_ATTACKS = [
        "crop",
        "screenshot_simulation",
        "identity",
    ]

    # Sampling probability weights (must sum to 1.0)
    _WEIGHTS = [
        0.45,   # crop
        0.45,   # screenshot_simulation
        0.10,   # identity
    ]  # total = 1.00

    def __init__(self, seed: int = 20260325):
        self.rng = np.random.default_rng(seed)

    # ── Public API ────────────────────────────────────────────────────────────

    def apply_batch(
        self,
        images: torch.Tensor,
        attack_name: Optional[str] = None,
    ) -> tuple[torch.Tensor, list[AttackMeta]]:
        """
        Apply the same randomly selected attack to every image in the batch.

        Args:
            images      : (B, 3, H, W) float32 [0,1]
            attack_name : optional override; if None, random selection

        Returns:
            attacked : (B, 3, H, W) float32 [0,1]
            metas    : list of AttackMeta (one per image)
        """
        name = attack_name or self._sample_attack()
        fn = self._dispatch(name)

        attacked_list = []
        meta_list = []
        for i in range(images.size(0)):
            single = images[i:i+1]           # (1, 3, H, W)
            att, meta = fn(single)
            attacked_list.append(att)
            meta_list.append(meta)

        return torch.cat(attacked_list, dim=0), meta_list

    def apply_single(
        self,
        image: torch.Tensor,
        attack_name: Optional[str] = None,
    ) -> tuple[torch.Tensor, AttackMeta]:
        """Same as apply_batch but for a single image (1,3,H,W)."""
        name = attack_name or self._sample_attack()
        return self._dispatch(name)(image)

    # ── Dispatch ──────────────────────────────────────────────────────────────

    def _sample_attack(self) -> str:
        return self.rng.choice(self.ALL_ATTACKS, p=self._WEIGHTS)

    def _dispatch(self, name: str):
        mapping = {
            "jpeg_compression":    self._jpeg,
            "crop":                self._crop,
            "resize":              self._resize,
            "rotation":            self._rotation,
            "gaussian_blur":       self._gaussian_blur,
            "gaussian_noise":      self._gaussian_noise,
            "brightness":          self._brightness,
            "contrast":            self._contrast,
            "perspective_warp":    self._perspective_warp,
            "screenshot_simulation": self._screenshot,
            "social_media":        self._social_media,
            "median_filter":       self._median_filter,
            "sharpen":             self._sharpen,
            "identity":            self._identity,
            "combined":            self._combined,
        }
        if name not in mapping:
            raise ValueError(f"Unknown attack: {name}")
        return mapping[name]

    # ── Individual Attacks ────────────────────────────────────────────────────

    def _identity(self, img: torch.Tensor) -> tuple[torch.Tensor, AttackMeta]:
        return img.clone(), AttackMeta("identity", 0.0)

    # 1. JPEG compression
    def _jpeg(self, img: torch.Tensor) -> tuple[torch.Tensor, AttackMeta]:
        quality = int(self.rng.integers(20, 91))
        arr = _t2np(img)  # (1,H,W,3)
        result = []
        for frame in arr:
            bgr = cv2.cvtColor(frame, cv2.COLOR_RGB2BGR)
            ok, buf = cv2.imencode(".jpg", bgr, [cv2.IMWRITE_JPEG_QUALITY, quality])
            if ok:
                dec = cv2.imdecode(buf, cv2.IMREAD_COLOR)
                frame = cv2.cvtColor(dec, cv2.COLOR_BGR2RGB)
            result.append(frame)
        severity = float(np.interp(quality, [20, 91], [0.95, 0.10]))
        return _np2t(np.stack(result), img.device), AttackMeta("jpeg", severity)

    # 2. Crop
    def _crop(self, img: torch.Tensor) -> tuple[torch.Tensor, AttackMeta]:
        _, _, H, W = img.shape
        ratio = float(self.rng.uniform(0.65, 0.96))
        ch = max(24, int(H * ratio))
        cw = max(24, int(W * ratio))
        top  = int(self.rng.integers(0, max(1, H - ch + 1)))
        left = int(self.rng.integers(0, max(1, W - cw + 1)))
        cropped = img[:, :, top:top+ch, left:left+cw]
        restored = F.interpolate(cropped, size=(H, W), mode="bilinear", align_corners=False)
        severity = float(np.interp(ratio, [0.65, 0.96], [0.90, 0.15]))
        return torch.clamp(restored, 0, 1), AttackMeta("crop", severity)

    # 3. Resize (down then up)
    def _resize(self, img: torch.Tensor) -> tuple[torch.Tensor, AttackMeta]:
        _, _, H, W = img.shape
        scale = float(self.rng.uniform(0.45, 0.90))
        nh, nw = max(24, int(H * scale)), max(24, int(W * scale))
        down = F.interpolate(img, size=(nh, nw), mode="area")
        up   = F.interpolate(down, size=(H, W), mode="bilinear", align_corners=False)
        severity = float(np.interp(scale, [0.45, 0.90], [0.88, 0.15]))
        return torch.clamp(up, 0, 1), AttackMeta("resize", severity)

    # 4. Rotation
    def _rotation(self, img: torch.Tensor) -> tuple[torch.Tensor, AttackMeta]:
        _, _, H, W = img.shape
        angle = float(self.rng.uniform(-15.0, 15.0))
        arr = _t2np(img)
        result = []
        cx, cy = W / 2, H / 2
        M = cv2.getRotationMatrix2D((cx, cy), angle, 1.0)
        for frame in arr:
            rotated = cv2.warpAffine(frame, M, (W, H),
                                     flags=cv2.INTER_LINEAR,
                                     borderMode=cv2.BORDER_REFLECT101)
            result.append(rotated)
        severity = float(np.interp(abs(angle), [0, 15], [0.05, 0.70]))
        return _np2t(np.stack(result), img.device), AttackMeta("rotation", severity)

    # 5. Gaussian blur
    def _gaussian_blur(self, img: torch.Tensor) -> tuple[torch.Tensor, AttackMeta]:
        k = int(self.rng.choice([3, 5, 7, 9]))
        sigma = float(self.rng.uniform(0.5, 3.0))
        arr = _t2np(img)
        result = [cv2.GaussianBlur(f, (k, k), sigma) for f in arr]
        severity = float(np.interp(k + sigma, [3.5, 12.0], [0.10, 0.80]))
        return _np2t(np.stack(result), img.device), AttackMeta("gaussian_blur", severity)

    # 6. Gaussian noise
    def _gaussian_noise(self, img: torch.Tensor) -> tuple[torch.Tensor, AttackMeta]:
        sigma = float(self.rng.uniform(0.01, 0.06))
        noise = torch.randn_like(img) * sigma
        severity = float(np.interp(sigma, [0.01, 0.06], [0.10, 0.80]))
        return torch.clamp(img + noise, 0, 1), AttackMeta("gaussian_noise", severity)

    # 7. Brightness
    def _brightness(self, img: torch.Tensor) -> tuple[torch.Tensor, AttackMeta]:
        delta = float(self.rng.uniform(-0.30, 0.30))
        severity = float(abs(delta) / 0.30)
        return torch.clamp(img + delta, 0, 1), AttackMeta("brightness", severity)

    # 8. Contrast
    def _contrast(self, img: torch.Tensor) -> tuple[torch.Tensor, AttackMeta]:
        factor = float(self.rng.uniform(0.70, 1.35))
        mean   = img.mean(dim=[2, 3], keepdim=True)
        stretched = mean + (img - mean) * factor
        severity = float(abs(1.0 - factor) / 0.35)
        return torch.clamp(stretched, 0, 1), AttackMeta("contrast", severity)

    # 9. Perspective warp
    def _perspective_warp(self, img: torch.Tensor) -> tuple[torch.Tensor, AttackMeta]:
        _, _, H, W = img.shape
        arr = _t2np(img)
        shift = 0.05
        result = []
        for frame in arr:
            src = np.float32([[0,0],[W-1,0],[0,H-1],[W-1,H-1]])
            dst = src + np.float32([
                [W*self.rng.uniform(-shift, shift), H*self.rng.uniform(-shift, shift)],
                [W*self.rng.uniform(-shift, shift), H*self.rng.uniform(-shift, shift)],
                [W*self.rng.uniform(-shift, shift), H*self.rng.uniform(-shift, shift)],
                [W*self.rng.uniform(-shift, shift), H*self.rng.uniform(-shift, shift)],
            ])
            M = cv2.getPerspectiveTransform(src, dst)
            warped = cv2.warpPerspective(frame, M, (W, H),
                                         borderMode=cv2.BORDER_REFLECT101)
            result.append(warped)
        return _np2t(np.stack(result), img.device), AttackMeta("perspective_warp", 0.50)

    # 10. Screenshot simulation
    def _screenshot(self, img: torch.Tensor) -> tuple[torch.Tensor, AttackMeta]:
        # Step 1: Perspective warp
        att, _ = self._perspective_warp(img)
        # Step 2: Gamma shift
        gamma = float(self.rng.uniform(0.80, 1.25))
        att = torch.clamp(att ** gamma, 0, 1)
        # Step 3: Moire / scanline pattern
        _, _, H, W = att.shape
        line_freq = float(self.rng.uniform(6, 20))
        lines = torch.sin(
            torch.linspace(0, math.pi * line_freq, H, device=att.device)
        ).view(1, 1, H, 1)
        lines = lines * float(self.rng.uniform(0.004, 0.020))
        att = torch.clamp(att + lines, 0, 1)
        # Step 4: JPEG re-compress
        att, _ = self._jpeg(att)
        return att, AttackMeta("screenshot_simulation", 0.72)

    # 11. Social media recompression
    def _social_media(self, img: torch.Tensor) -> tuple[torch.Tensor, AttackMeta]:
        # 1st JPEG
        q1 = int(self.rng.integers(60, 90))
        att, _ = self._jpeg(img)
        # Resize simulation (platform thumbnail scaling)
        att, _ = self._resize(att)
        # 2nd JPEG
        att, _ = self._jpeg(att)
        return att, AttackMeta("social_media", 0.65)

    # 12. Median filter (texture-smoothing / denoising attack)
    def _median_filter(self, img: torch.Tensor) -> tuple[torch.Tensor, AttackMeta]:
        k = int(self.rng.choice([3, 5]))
        arr = _t2np(img)
        result = [cv2.medianBlur(f, k) for f in arr]
        severity = 0.30 if k == 3 else 0.55
        return _np2t(np.stack(result), img.device), AttackMeta("median_filter", severity)

    # 13. Sharpen (unsharp mask)
    def _sharpen(self, img: torch.Tensor) -> tuple[torch.Tensor, AttackMeta]:
        arr = _t2np(img)
        result = []
        for frame in arr:
            blurred = cv2.GaussianBlur(frame, (5, 5), 1.0)
            sharpened = cv2.addWeighted(frame, 1.5, blurred, -0.5, 0)
            result.append(sharpened)
        return _np2t(np.stack(result), img.device), AttackMeta("sharpen", 0.25)

    # 15. Combined (2–3 random attacks chained)
    def _combined(self, img: torch.Tensor) -> tuple[torch.Tensor, AttackMeta]:
        pool = [a for a in self.ALL_ATTACKS if a not in ("identity", "combined")]
        chosen = list(self.rng.choice(pool, size=int(self.rng.integers(2, 4)), replace=False))
        chain = img
        severities = []
        for name in chosen:
            chain, meta = self._dispatch(name)(chain)
            severities.append(meta.severity)
        severity = float(min(0.98, float(np.mean(severities)) + 0.12))
        return chain, AttackMeta(f"combined({'+'.join(chosen)})", severity)

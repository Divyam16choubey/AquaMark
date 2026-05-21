/**
 * routes/embed.js — POST /api/embed-watermark
 *
 * Accepts: multipart form { file, watermark_text?, strength? }
 * Returns: JSON matching the frontend EmbedPage.jsx expectations:
 *   {
 *     job_id, message, download_url,
 *     model_status: { device, trained },
 *     preview: { original: string, watermarked: string },
 *     metrics: { psnr, ssim, requested_strength, ... }
 *   }
 */

const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { runPython, AI_MODEL_DIR } = require("../helpers/runPython");
const { makeJobId } = require("../helpers/imageUtils");

const router = express.Router();

// Store uploads in backend_modified/uploads/
const upload = multer({
  dest: path.join(__dirname, "..", "uploads"),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
});

router.post("/embed-watermark", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ detail: "No image file uploaded." });
    }

    const jobId = makeJobId("embed");
    const watermarkText = req.body.watermark_text || "AquaMark";
    const strength = parseFloat(req.body.strength) || 0.18;

    // Rename uploaded file to have proper extension
    const origExt = path.extname(req.file.originalname) || ".png";
    const inputPath = req.file.path + origExt;
    fs.renameSync(req.file.path, inputPath);

    // Output path for the watermarked image
    const outputDir = path.join(__dirname, "..", "outputs", "embed");
    const outputPath = path.join(outputDir, `${jobId}_watermarked.png`);

    // Run: python predict.py embed <input> --output <output> --text <text> --strength <s>
    const { stdout, stderr, code } = await runPython("embed", [
      inputPath,
      "--output", outputPath,
      "--text", watermarkText,
      "--strength", String(strength),
    ]);

    if (code !== 0) {
      console.error("[Embed] Python error:", stderr);
      return res.status(500).json({ detail: `Embedding failed: ${stderr.slice(-500)}` });
    }

    // Check output exists
    if (!fs.existsSync(outputPath)) {
      return res.status(500).json({ detail: "Embedding produced no output file." });
    }

    // Return lightweight preview URLs instead of large base64 payloads.
    const watermarkedFilename = `${jobId}_watermarked.png`;

    // Parse PSNR/SSIM from stdout
    const psnrMatch = stdout.match(/PSNR=([\d.]+)/);
    const ssimMatch = stdout.match(/SSIM=([\d.]+)/);
    const psnrVal = psnrMatch ? parseFloat(psnrMatch[1]) : 0;
    const ssimVal = ssimMatch ? parseFloat(ssimMatch[1]) : 0;

    // Clean up the uploaded original after processing
    // (keep watermarked for download)

    res.json({
      job_id: jobId,
      message: "Invisible watermark embedded successfully.",
      download_url: `/api/download/${jobId}`,
      source_filename: req.file.originalname,
      watermarked_filename: watermarkedFilename,
      model_status: {
        device: "cuda",
        trained: fs.existsSync(path.join(AI_MODEL_DIR, "checkpoints", "checkpoint_best.pt")),
      },
      preview: {
        original: "",
        watermarked: `/outputs/embed/${watermarkedFilename}`,
      },
      metrics: {
        psnr: `${psnrVal} dB`,
        ssim: ssimVal.toFixed(5),
        requested_strength: strength.toFixed(4),
        embedding_strength: strength.toFixed(4),
        watermark_bits: "64",
      },
      resized_for_inference: false,
    });
  } catch (err) {
    console.error("[Embed] Error:", err);
    res.status(500).json({ detail: `Embedding failed: ${err.message}` });
  }
});

module.exports = router;

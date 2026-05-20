/**
 * routes/verify.js — POST /api/verify-watermark
 *
 * Accepts: multipart form { file, watermark_text? }
 * Returns: JSON matching the frontend VerifyPage.jsx expectations:
 *   {
 *     job_id, message,
 *     analysis: {
 *       state: "safe" | "corrupted" | "absent",
 *       watermark_present: bool,
 *       confidence_score: number,
 *       bit_error_rate: number,
 *       bit_margin: number,
 *       decoded_signature: string,
 *       expected_signature: string,
 *       integrity_probabilities: { safe: number, corrupted: number, absent: number },
 *     },
 *     preview: { uploaded: base64 },
 *   }
 */

const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { runPython, AI_MODEL_DIR } = require("../helpers/runPython");
const { imageToBase64, makeJobId } = require("../helpers/imageUtils");

const router = express.Router();

const upload = multer({
  dest: path.join(__dirname, "..", "uploads"),
  limits: { fileSize: 20 * 1024 * 1024 },
});

router.post("/verify-watermark", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ detail: "No image file uploaded." });
    }

    const jobId = makeJobId("verify");
    const watermarkText = req.body.watermark_text || "AquaMark";

    // Rename uploaded file to have proper extension
    const origExt = path.extname(req.file.originalname) || ".png";
    const inputPath = req.file.path + origExt;
    fs.renameSync(req.file.path, inputPath);

    // Output path for JSON result
    const outputDir = path.join(__dirname, "..", "outputs", "verify");
    const resultJsonPath = path.join(outputDir, `${jobId}_result.json`);

    // Run: python predict.py verify <input> --text <text> --output <json>
    const { stdout, stderr, code } = await runPython("verify", [
      inputPath,
      "--text", watermarkText,
      "--output", resultJsonPath,
    ]);

    if (code !== 0) {
      console.error("[Verify] Python error:", stderr);
      return res.status(500).json({ detail: `Verification failed: ${stderr.slice(-500)}` });
    }

    // Parse the result from predict.py's JSON output (or from stdout)
    let pyResult = {};
    if (fs.existsSync(resultJsonPath)) {
      pyResult = JSON.parse(fs.readFileSync(resultJsonPath, "utf-8"));
    } else {
      // Fallback: parse stdout for key values
      const statusMatch = stdout.match(/Status=(\w+)/);
      const confMatch = stdout.match(/confidence=([\d.]+)/);
      const berMatch = stdout.match(/BER=([\d.]+)/);
      pyResult = {
        status: statusMatch ? statusMatch[1] : "ABSENT",
        confidence: confMatch ? parseFloat(confMatch[1]) : 0,
        ber: berMatch ? parseFloat(berMatch[1]) : 0.5,
        integrity_probs: { ABSENT: 0.33, SAFE: 0.33, CORRUPTED: 0.33 },
        decoded_bits_hex: "N/A",
        expected_bits_hex: "N/A",
      };
    }

    // Build the uploaded image preview
    const uploadedPreview = imageToBase64(inputPath);

    // Map the Python output format to the frontend's expected format
    const state = (pyResult.status || "ABSENT").toLowerCase();
    const watermarkPresent = state !== "absent";
    const intProbs = pyResult.integrity_probs || {};

    // The frontend reads confidence_score as a plain number (0-100)
    const confidenceScore = pyResult.confidence || 0;

    // Compute bit_margin from the BER (higher BER = lower margin)
    const ber = pyResult.ber || 0.5;
    const bitMargin = Math.max(0, (1.0 - ber / 0.5)).toFixed(5);

    res.json({
      job_id: jobId,
      message: "Watermark verification completed.",
      analysis: {
        watermark_present: watermarkPresent,
        state: state,
        confidence_score: confidenceScore,
        bit_error_rate: parseFloat(ber.toFixed(5)),
        bit_margin: parseFloat(bitMargin),
        decoded_signature: pyResult.decoded_bits_hex || "N/A",
        expected_signature: pyResult.expected_bits_hex || "N/A",
        integrity_probabilities: {
          safe: parseFloat(((intProbs.SAFE || 0) * 100).toFixed(1)),
          corrupted: parseFloat(((intProbs.CORRUPTED || 0) * 100).toFixed(1)),
          absent: parseFloat(((intProbs.ABSENT || 0) * 100).toFixed(1)),
        },
        model_trained: fs.existsSync(path.join(AI_MODEL_DIR, "checkpoints", "checkpoint_best.pt")),
      },
      model_status: {
        device: "cuda",
        trained: fs.existsSync(path.join(AI_MODEL_DIR, "checkpoints", "checkpoint_best.pt")),
      },
      preview: {
        uploaded: uploadedPreview,
      },
    });
  } catch (err) {
    console.error("[Verify] Error:", err);
    res.status(500).json({ detail: `Verification failed: ${err.message}` });
  }
});

module.exports = router;

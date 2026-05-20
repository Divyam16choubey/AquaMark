/**
 * routes/status.js — GET /api/model-status
 *
 * Returns the AI model status for the frontend App.jsx health check.
 * The frontend uses this to show warning banners if the model isn't trained.
 */

const express = require("express");
const path = require("path");
const fs = require("fs");
const { AI_MODEL_DIR } = require("../helpers/runPython");

const router = express.Router();

router.get("/model-status", (req, res) => {
  const checkpointPath = path.join(AI_MODEL_DIR, "checkpoints", "checkpoint_best.pt");
  const checkpointExists = fs.existsSync(checkpointPath);

  res.json({
    model_status: {
      device: "cuda",
      trained: checkpointExists,
      architecture: "SpreadSpectrum CNN + MatchedFilter",
      watermark_bits: 64,
    },
    checkpoint_exists: checkpointExists,
    metadata: {
      model_name: "AquaMark Neural Watermark v2.0",
      attacks_supported: ["crop", "screenshot_simulation", "identity"],
    },
  });
});

module.exports = router;

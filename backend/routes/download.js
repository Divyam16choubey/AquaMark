/**
 * routes/download.js — GET /api/download/:jobId
 *
 * Serves the watermarked PNG file for download.
 */

const express = require("express");
const path = require("path");
const fs = require("fs");

const router = express.Router();

router.get("/download/:jobId", (req, res) => {
  const { jobId } = req.params;
  const filePath = path.join(__dirname, "..", "outputs", "embed", `${jobId}_watermarked.png`);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ detail: "Embedded image not found." });
  }

  res.download(filePath, `${jobId}_watermarked.png`, (err) => {
    if (err) {
      console.error("[Download] Error:", err);
      res.status(500).json({ detail: "Download failed." });
    }
  });
});

module.exports = router;

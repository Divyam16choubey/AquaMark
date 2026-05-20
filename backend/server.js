/**
 * server.js — AquaMark Node.js + Express Backend
 *
 * This server acts as an HTTP gateway between the React frontend and the
 * Python AI watermark model. It handles:
 *   - File uploads via multer
 *   - Spawning `python predict.py embed/verify` as child processes
 *   - Serving watermarked images for download
 *   - Model status endpoint
 *
 * API Contract (matches frontend's api.js):
 *   POST /api/embed-watermark   → multipart { file, watermark_text, strength }
 *   POST /api/verify-watermark  → multipart { file, watermark_text }
 *   GET  /api/download/:jobId   → watermarked PNG file
 *   GET  /api/model-status      → { model_status, checkpoint_exists }
 */

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

const embedRoute = require("./routes/embed");
const verifyRoute = require("./routes/verify");
const statusRoute = require("./routes/status");
const downloadRoute = require("./routes/download");

const app = express();
const PORT = process.env.PORT || 8000;

// ── Ensure runtime directories exist ─────────────────────────────────────────
const DIRS = [
  path.join(__dirname, "uploads"),
  path.join(__dirname, "outputs", "embed"),
  path.join(__dirname, "outputs", "verify"),
];
DIRS.forEach((d) => fs.mkdirSync(d, { recursive: true }));

// ── Middleware ────────────────────────────────────────────────────────────────
const origins = (process.env.CORS_ORIGINS || "http://localhost:5173").split(",");
app.use(cors({ origin: origins, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static output files
app.use("/outputs", express.static(path.join(__dirname, "outputs")));

// ── Routes ───────────────────────────────────────────────────────────────────
app.use("/api", embedRoute);
app.use("/api", verifyRoute);
app.use("/api", statusRoute);
app.use("/api", downloadRoute);

// ── Root ─────────────────────────────────────────────────────────────────────
app.get("/", (req, res) => {
  res.json({
    name: "AquaMark AI Invisible Watermark Platform",
    version: "2.0.0",
    status: "running",
    docs: "/api/model-status",
  });
});

app.get("/health", (req, res) => {
  res.json({ status: "healthy" });
});

// ── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n===================================================`);
  console.log(`  AquaMark Backend (Node.js + Express)`);
  console.log(`  Listening on http://localhost:${PORT}`);
  console.log(`  AI Model Dir: ${path.resolve(process.env.AI_MODEL_DIR || "../ai_watermark_model")}`);
  console.log(`===================================================\n`);
});

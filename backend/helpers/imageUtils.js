/**
 * helpers/imageUtils.js — Image encoding utilities
 */

const fs = require("fs");
const path = require("path");

/**
 * Convert an image file to a base64 data URI for frontend preview.
 * @param {string} filePath - Absolute path to the image
 * @returns {string} data:image/png;base64,...
 */
function imageToBase64(filePath) {
  if (!fs.existsSync(filePath)) return "";
  const ext = path.extname(filePath).slice(1).toLowerCase();
  const mime = ext === "jpg" ? "jpeg" : ext;
  const buffer = fs.readFileSync(filePath);
  return `data:image/${mime};base64,${buffer.toString("base64")}`;
}

/**
 * Generate a unique job ID.
 * @param {string} prefix - e.g. "embed" or "verify"
 * @returns {string}
 */
function makeJobId(prefix = "job") {
  const { v4: uuidv4 } = require("uuid");
  return `${prefix}_${uuidv4().split("-")[0]}`;
}

module.exports = { imageToBase64, makeJobId };

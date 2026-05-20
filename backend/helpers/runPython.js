/**
 * helpers/runPython.js — Spawn a Python child process and collect output
 *
 * This is the bridge between Node.js and the PyTorch AI model.
 * It runs `python ai_model/predict.py <command> <args>` and collects the result.
 */

const { spawn } = require("child_process");
const path = require("path");

const PYTHON_CMD = process.env.PYTHON_CMD || "python";
const AI_MODEL_DIR = path.resolve(
  __dirname,
  "..",
  process.env.AI_MODEL_DIR || "ai_model"
);

/**
 * Run a Python inference command and return the result.
 *
 * @param {string} command  - "embed" or "verify"
 * @param {string[]} args   - CLI arguments for predict.py
 * @returns {Promise<{stdout: string, stderr: string, code: number}>}
 */
function runPython(command, args = []) {
  return new Promise((resolve, reject) => {
    const predictScript = path.join(AI_MODEL_DIR, "predict.py");
    const fullArgs = [predictScript, command, ...args];

    console.log(`[Python] ${PYTHON_CMD} ${fullArgs.join(" ")}`);

    const proc = spawn(PYTHON_CMD, fullArgs, {
      cwd: AI_MODEL_DIR,
      env: { ...process.env, PYTHONIOENCODING: "utf-8" },
    });

    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (data) => {
      const chunk = data.toString();
      stdout += chunk;
      // Log Python output in real-time so the user can see progress
      process.stdout.write(`  [py] ${chunk}`);
    });

    proc.stderr.on("data", (data) => {
      const chunk = data.toString();
      stderr += chunk;
      // Only log non-FutureWarning stderr (those are harmless PyTorch warnings)
      if (!chunk.includes("FutureWarning") && !chunk.includes("weights_only")) {
        process.stderr.write(`  [py:err] ${chunk}`);
      }
    });

    proc.on("close", (code) => {
      console.log(`[Python] Process exited with code ${code}`);
      resolve({ stdout, stderr, code });
    });

    proc.on("error", (err) => {
      reject(new Error(`Failed to spawn Python: ${err.message}`));
    });
  });
}

module.exports = { runPython, AI_MODEL_DIR, PYTHON_CMD };

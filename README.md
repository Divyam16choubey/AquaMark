# AquaMark AI

AquaMark is an invisible image watermarking platform with a React frontend, an Express backend, and a PyTorch inference core.

This repository also includes the project paper [AM_Documentation.pdf](./AM_Documentation.pdf), which presents an SVM-based integrity prediction approach. The current runtime in code is a neural encoder/decoder pipeline invoked through Node.js.

## What This Project Does

- Embeds a 64-bit invisible watermark derived from user text.
- Verifies whether a suspect image is `safe`, `corrupted`, or `absent`.
- Reports confidence, BER (bit error rate), decoded signature fragments, and integrity probabilities.
- Supports sample-image workflows from the frontend for quick testing.
- Exposes model readiness (`trained` checkpoint present or not) to the UI.

## Architecture (Implemented Runtime)

### 1. Frontend (React + Vite)

Main flow pages:
- `frontend/src/pages/EmbedPage.jsx`
- `frontend/src/pages/VerifyPage.jsx`

Behavior:
- Upload images up to 20 MB.
- Set watermark text and embedding strength.
- Preview original and processed images.
- Download generated watermarked output.
- Show warning banners when the detector is untrained.

### 2. Backend Gateway (Node.js + Express)

Entrypoint:
- `backend/server.js`

Responsibilities:
- File upload handling via `multer`.
- API routing for embed/verify/download/model status.
- Spawning Python inference with `backend/helpers/runPython.js`.
- Serving generated artifacts from `backend/outputs`.

### 3. AI Core (PyTorch)

Entrypoint:
- `backend/ai_model/predict.py`

Key modules:
- `backend/ai_model/inference/embed.py`
- `backend/ai_model/inference/verify.py`
- `backend/ai_model/models/encoder.py`
- `backend/ai_model/models/decoder.py`
- `backend/ai_model/attacks/simulator.py`

Core logic:
- Text is hashed/converted into a 64-bit payload.
- Encoder generates a low-amplitude residual and watermarked image.
- Decoder predicts bit probabilities + integrity probabilities.
- Final integrity state blends BER thresholds with classifier confidence.

## API Endpoints (Current)

Base URL: `http://localhost:8000`

- `GET /` : service metadata
- `GET /health` : health ping
- `GET /api/model-status` : checkpoint/model status summary
- `POST /api/embed-watermark` : embed watermark into uploaded image
- `POST /api/verify-watermark` : verify watermark from uploaded image
- `GET /api/download/:jobId` : download generated watermarked image

## Setup

## Prerequisites

- Python 3.10+
- Node.js 18+

## Install Dependencies

```bash
pip install -r requirements.txt
cd backend && npm install
cd ../frontend && npm install
```

## Run Backend

From project root:

```bash
cd backend
npm run dev
```

Backend runs on `http://localhost:8000` by default.

## Run Frontend

In a second terminal:

```bash
cd frontend
npm run dev
```

Frontend runs on `http://localhost:5173`.

## Optional AI CLI Checks

From `backend/ai_model`:

```bash
python predict.py embed ../../test_images/synthetic_noise.png --output ../../outputs/watermarked.png --text "AquaMark"
python predict.py verify ../../outputs/watermarked.png --text "AquaMark"
```

## Project Structure

```text
AquaMark/
|-- backend/
|   |-- server.js
|   |-- routes/
|   |-- helpers/
|   |-- ai_model/
|   |-- uploads/
|   `-- outputs/
|-- frontend/
|   |-- src/
|   `-- public/
|-- test_images/
|-- outputs/
|-- AM_Documentatio pdf
|-- theory.ipynb
|-- requirements.txt
`-- README.md
```

## Alignment with AM_Documentation.pdf

`AM_Documentation.pdf` documents the academic baseline:
- invisible watermarking,
- attack simulation,
- feature extraction,
- RBF-SVM integrity classification,
- CIFAR-10 based evaluation (reported ~92-95% accuracy).

Current codebase direction:
- preserves the same high-level integrity verification goal,
- but runtime inference is implemented with a neural encoder/decoder instead of the paper's SVM feature classifier.

Both are valuable:
- Paper: methodology and academic framing.
- Code: deployable full-stack product workflow.

## Notes

- Some legacy references in the frontend (`Docs.jsx`, `Dashboard.jsx`) still mention old SVM/FastAPI endpoints that are not currently wired into `App.jsx` routes.
- `run_project.bat` and `run_project.sh` currently point to FastAPI (`uvicorn backend.main:app`) and should be treated as legacy launch scripts unless updated.

## Documentation Pairing

- [README.md](./README.md): setup, architecture, APIs, and run workflow.
- [theory.ipynb](./theory.ipynb): conceptual model, equations, and paper-to-code mapping.

## License

For educational and research use.

# AquaMark AI

Invisible image watermarking platform with a TensorFlow encoder/decoder backend, a FastAPI API layer, and a React + Vite frontend for embedding and verification workflows.

For the implementation notes and theory view of the same system, see [theory.ipynb](./theory.ipynb). The notebook links back here for setup and run commands.

## Overview

- Embeds a 64-bit text-derived watermark into an image with a trainable encoder.
- Verifies watermark presence and integrity with a decoder that returns bit probabilities and integrity classes.
- Exposes model health through `/health` and `/api/model-status`, including whether trained checkpoints are loaded.
- Serves a modern frontend for upload, preview, download, and verification flows.

## Active Architecture

The current runtime path is the TensorFlow watermarking stack started by `backend/main.py`.

- `backend/models/encoder.py`: builds the image + watermark encoder.
- `backend/models/decoder.py`: reconstructs watermark bits and integrity probabilities.
- `backend/models/training_pipeline.py`: attack-aware training loop and checkpoint export.
- `backend/services/embed_service.py`: embed flow used by `/api/embed-watermark`.
- `backend/services/verify_service.py`: verification flow used by `/api/verify-watermark`.
- `frontend/src/pages/EmbedPage.jsx` and `frontend/src/pages/VerifyPage.jsx`: user-facing flows.

Legacy SVM-era artifacts still exist in the repository for reference, but they are not the active runtime used by the FastAPI app.

## Quick Start

### Prerequisites

- Python 3.10+
- Node.js 18+

### 1. Install backend dependencies

```bash
pip install -r requirements.txt
```

### 2. Install frontend dependencies

```bash
cd frontend
npm install
```

### 3. Optional: train checkpoints

The app can start without checkpoints, but it will report `trained: false` until weights are generated.

```bash
python -m backend.train --epochs 4 --steps-per-epoch 40 --validation-steps 8 --batch-size 4
```

You can also export synthetic covers during training setup:

```bash
python -m backend.train --generate-synthetic-covers 64
```

### 4. Start the backend

Run this from the project root:

```bash
uvicorn backend.main:app --reload --port 8000
```

Backend URLs:

- App root: `http://localhost:8000/`
- Health: `http://localhost:8000/health`
- OpenAPI docs: `http://localhost:8000/docs`

### 5. Start the frontend

In a second terminal:

```bash
cd frontend
npm run dev
```

Frontend URL:

- UI: `http://localhost:5173`

## Runtime Behavior

- On startup, the backend creates runtime directories and warms the model registry.
- If `models/encoder.weights.h5` and `models/decoder.weights.h5` exist, they are loaded automatically.
- If checkpoints are missing, the frontend now surfaces a warning banner so users know the flow is live but the model is still untrained.
- Processed artifacts are written under `outputs/`, and uploaded runtime files are written under `data/uploads/`.

## API Surface

### Core routes

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/` | Basic runtime metadata |
| `GET` | `/health` | Health check + checkpoint presence |
| `GET` | `/api/model-status` | Model registry status + checkpoint metadata |
| `POST` | `/api/embed-watermark` | Embed an invisible watermark into an uploaded image |
| `GET` | `/api/download/{job_id}` | Download a generated watermarked PNG |
| `POST` | `/api/verify-watermark` | Recover watermark bits and predict integrity state |

### Typical flow

1. Start the backend and frontend.
2. Optionally confirm checkpoint state at `/api/model-status`.
3. Upload an image in the embed page and create a watermarked asset.
4. Download the output or pass it into the verify page.
5. Review integrity state, BER, confidence, and decoded signature data.

## Project Layout

```text
AquaMark/
|-- backend/
|   |-- main.py
|   |-- train.py
|   |-- config.py
|   |-- models/
|   |-- routes/
|   |-- services/
|   `-- utils/
|-- frontend/
|   |-- src/
|   |   |-- components/
|   |   |-- pages/
|   |   `-- services/
|   `-- package.json
|-- data/
|-- models/
|-- outputs/
|-- theory.ipynb
|-- requirements.txt
`-- README.md
```

## README and Theory Notebook

The two project docs are meant to complement each other:

- `README.md`: setup, commands, routes, and operational behavior.
- `theory.ipynb`: architecture summary, equations, training logic, and implementation notes.

If the runtime pipeline changes, update both files together so the operational and conceptual docs stay aligned.

## License

This project is for educational and research use.

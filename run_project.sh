#!/bin/bash
ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT_DIR"

echo "============================================================"
echo "  AquaMark AI - Intelligent Image Watermarking System"
echo "============================================================"
echo ""

echo "[1/3] Installing Python dependencies..."
python -m pip install -r requirements.txt
echo ""

echo "[2/3] Starting Backend Server..."
python -m uvicorn backend.main:app --reload --port 8000 &
BACKEND_PID=$!
echo "Backend starting on http://localhost:8000 (PID: $BACKEND_PID)"
echo ""

echo "[3/3] Installing and starting Frontend..."
cd frontend
npm install
npm run dev &
FRONTEND_PID=$!
cd ..
echo "Frontend starting on http://localhost:5173 (PID: $FRONTEND_PID)"
echo ""

echo "============================================================"
echo "  Both servers running."
echo "  Backend:  http://localhost:8000"
echo "  Frontend: http://localhost:5173"
echo "  API Docs: http://localhost:8000/docs"
echo "============================================================"
echo "Press Ctrl+C to stop both servers."

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" SIGINT SIGTERM
wait

#!/bin/bash
# Script to install dependencies and run FastAPI server bypassing global PATH issues

echo "=== RailSense AI Backend Setup ==="

# Install dependencies in the user environment
echo "Checking and installing required packages (fastapi, uvicorn, pydantic, numpy)..."
python3 -m pip install fastapi uvicorn pydantic numpy

# Launch uvicorn as a Python module to avoid PATH errors
echo "Launching Uvicorn server on http://localhost:8000..."
cd "$(dirname "$0")/backend"
python3 -m uvicorn app.main:app --reload --port 8000

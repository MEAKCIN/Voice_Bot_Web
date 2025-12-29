#!/bin/bash
source .venv/bin/activate

# Check for Ollama (Model Server)
if ! pgrep -x "ollama" > /dev/null; then
    echo "Starting Ollama..."
    ollama serve &
    sleep 5
fi

# Check if model exists
REQUIRED_MODEL="qwen2.5:latest"
if ! ollama list | grep -q "$REQUIRED_MODEL"; then
    echo "Pulling model $REQUIRED_MODEL..."
    ollama pull "$REQUIRED_MODEL"
fi

# Check for XTTS v2 model
XTTS_MODEL_DIR="models/xtts_v2"
if [ ! -d "$XTTS_MODEL_DIR" ] || [ -z "$(ls -A $XTTS_MODEL_DIR)" ]; then
    echo "Downloading XTTS model..."
    python scripts/download_models.py
fi

# Dynamically find site-packages for GPU libs
SITE_PACKAGES=$(python -c "import site; print(site.getsitepackages()[0])")
export LD_LIBRARY_PATH=$LD_LIBRARY_PATH:$SITE_PACKAGES/nvidia/cudnn/lib:$SITE_PACKAGES/nvidia/cublas/lib

echo "Starting Voice Bot..."
python src/bot.py

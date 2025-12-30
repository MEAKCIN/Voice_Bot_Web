#!/bin/bash
source .venv/bin/activate

# Dynamically find site-packages for GPU libs
SITE_PACKAGES=$(python -c "import site; print(site.getsitepackages()[0])")
export LD_LIBRARY_PATH=$LD_LIBRARY_PATH:$SITE_PACKAGES/nvidia/cudnn/lib:$SITE_PACKAGES/nvidia/cublas/lib

# Start vLLM Server
VLLM_MODEL="Qwen/Qwen2.5-1.5B-Instruct"
echo "Starting vLLM Server with model $VLLM_MODEL..."
VLLM_USE_V1=0 CUDA_VISIBLE_DEVICES=0 python -m vllm.entrypoints.openai.api_server \
    --model "$VLLM_MODEL" \
    --port 8001 \
    --gpu-memory-utilization 0.3 \
    --max-model-len 1024 \
    --dtype float16 \
    --enforce-eager &
VLLM_PID=$!
sleep 15  # Wait for vLLM to start

echo "Starting Backend Server..."
python backend/main.py &
BACKEND_PID=$!

echo "Starting Frontend..."
npm run dev --prefix frontend &
FRONTEND_PID=$!

echo "Voice Bot Web App is running!"
echo "vLLM PID: $VLLM_PID"
echo "Backend PID: $BACKEND_PID"
echo "Frontend PID: $FRONTEND_PID"

# Wait for processes
trap "kill $VLLM_PID $BACKEND_PID $FRONTEND_PID; exit" SIGINT SIGTERM
wait

#!/bin/bash
source .venv/bin/activate

# Dynamically find site-packages for GPU libs
# Kill running processes on ports
echo "Cleaning up ports 8000, 8001, 5173..."
fuser -k 8000/tcp 8001/tcp 5173/tcp > /dev/null 2>&1
sleep 2

SITE_PACKAGES=$(python -c "import site; print(site.getsitepackages()[0])")
export LD_LIBRARY_PATH=$LD_LIBRARY_PATH:$SITE_PACKAGES/nvidia/cudnn/lib:$SITE_PACKAGES/nvidia/cublas/lib

export PYTORCH_CUDA_ALLOC_CONF=expandable_segments:True

# Start vLLM Server
VLLM_MODEL="Qwen/Qwen2.5-1.5B-Instruct"
echo "Starting vLLM Server with model $VLLM_MODEL..."
export VLLM_LOGGING_LEVEL=WARNING
VLLM_USE_V1=0 CUDA_VISIBLE_DEVICES=0 python -m vllm.entrypoints.openai.api_server \
    --model "$VLLM_MODEL" \
    --port 8001 \
    --uvicorn-log-level warning \
    --gpu-memory-utilization 0.6 \
    --max-model-len 2048 \
    --dtype auto \
    --enforce-eager &
VLLM_PID=$!
# Wait for vLLM to start
echo "Waiting for vLLM to start..."
while ! curl -s http://localhost:8001/health > /dev/null; do
    echo "Waiting for vLLM..."
    sleep 5
done
echo "vLLM started!"

# Start Backend Server
echo "Starting Backend Server..."
# Run the new modular app
uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --log-level warning &
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

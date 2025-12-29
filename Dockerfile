# --- Stage 1: Build Frontend ---
FROM node:20-slim AS frontend-builder
WORKDIR /app/frontend

# Copy frontend dependency files
COPY frontend/package.json frontend/package-lock.json ./

# Install dependencies
RUN npm ci

# Copy frontend source
COPY frontend ./

# Build the frontend (outputs to /app/frontend/dist)
RUN npm run build


# --- Stage 2: Final Image ---
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies
# ffmpeg: for audio processing
# git: for potential pip git installs
# build-essential: for compiling python packages if needed
# libsndfile1: for audio file reading (soundfile)
RUN apt-get update && apt-get install -y \
    ffmpeg \
    git \
    build-essential \
    libsndfile1 \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first to leverage cache
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend and src code
COPY backend ./backend
COPY src ./src
COPY scripts ./scripts

# Download models during build (since they are gitignored)
# This ensures the image has the models "baked in" without needing them in the git repo
RUN python scripts/download_models.py

# Copy built frontend from Stage 1
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Expose ports
# 8000: Main Backend API (and Frontend)
# 8002: XTTS Server (spawned by backend)
EXPOSE 8000
EXPOSE 8002

# Environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
# Point to the internal dist folder
ENV FRONTEND_DIST=/app/frontend/dist

# Command to run the application
CMD ["python", "backend/main.py"]

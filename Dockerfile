# Base image
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies
# ffmpeg: for audio processing
# git: for potential pip git installs
# build-essential: for compiling python packages if needed
# libsndfile1: for audio file reading
RUN apt-get update && apt-get install -y \
    ffmpeg \
    git \
    build-essential \
    libsndfile1 \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first to leverage cache
COPY requirements.txt .

# Install Python dependencies
# Note: TTS can be heavy, increasing timeout just in case
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application
COPY . .

# Expose ports
# 8000: Main Backend API
# 8002: XTTS Server (spawned by backend)
EXPOSE 8000
EXPOSE 8002

# Environment variables
# Prevent Python from writing pyc files
ENV PYTHONDONTWRITEBYTECODE=1
# Keep stdout/stderr unbuffered
ENV PYTHONUNBUFFERED=1

# Command to run the application
# We use the same entry point as the local setup
CMD ["python", "backend/main.py"]

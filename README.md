# 🎙️ Voice Bot Web

A modern, real-time Voice Bot application featuring a sleek, glassmorphic React frontend and a powerful distributed Python backend. This project integrates Speech-to-Text (STT), Large Language Models (LLM), and Text-to-Speech (TTS) to create a seamless conversational experience with near-instant responses.

![Voice Bot Interface](frontend/public/vite.svg) *Add a screenshot of your app here*

## ✨ Features

- **Real-time Voice Interaction**: Talk to the bot naturally. The system handles voice activity detection (VAD), interruption, and response generation.
- **Premium UI/UX**: Validated "Midnight/Violet" dark mode design with:
  -   Glassmorphism aesthetics
  -   Dynamic mesh gradient backgrounds
  -   Audio-reactive visualizers (Orb)
-   **Multilingual Support**: Switch seamlessly between **English** and **Turkish**.
-   **Distributed Local AI**:
  -   **LLM**: Uses **Ollama** (Qwen 2.5) for intelligent, context-aware responses.
  -   **STT**: Uses **Faster-Whisper** (`large-v3`) running on GPU (CUDA).
  -   **TTS**: Uses **XTTS v2** for high-fidelity voice cloning, running on a dedicated microservice (Port 8002).
-   **Robust Backend**: FastAPI-based architecture with separate services for logic and synthesis to prevent blocking.

## 🚀 Prerequisites

- **Linux/Ubuntu** (Recommended) with NVIDIA Drivers
- **Python 3.10+**
- **Node.js 18+** & **npm**
- **Ollama**: [Download Ollama](https://ollama.com/) and ensure it is installed (`ollama serve`).

## 🛠️ Quick Start

We provide a robust startup script that handles environment setup, model checks, and process management.

1.  **Clone the Repository**
    ```bash
    git clone https://github.com/YOUR_USERNAME/Voice_Bot_Web.git
    cd Voice_Bot_Web
    ```

2.  **Setup Environment**
    ```bash
    # Create virtual environment and install dependencies
    python3 -m venv .venv
    source .venv/bin/activate
    pip install -r requirements.txt
    
    # Initialize Frontend
    cd frontend
    npm install
    cd ..
    ```

3.  **Run the Application**
    ```bash
    ./scripts/run.sh
    ```
    This script will:
    -   Check/Start Ollama.
    -   Download required models (XTTS v2, Qwen 2.5) if missing.
    -   Launch the Backend (main logic) on `http://localhost:8000`.
    -   Launch the XTTS Service on `http://localhost:8002`.
    -   Launch the Frontend on `http://localhost:5173`.

4.  **Access the App**
    Open your browser to `http://localhost:5173`.

## � Architecture

-   **Frontend (5173)**: React + Vite + TailwindCSS. Handles audio recording, VAD visualization, and playback.
-   **Backend API (8000)**: FastAPI. Orchestrates STT validation, LLM streaming, and chat history.
-   **XTTS Service (8002)**: Dedicated FastAPI service. Loads the heavy XTTS model to generate audio without freezing the main thread.

## � Troubleshooting

### Port Conflicts (Address already in use)
If the application crashes or freezes, you may have "zombie" processes holding the ports. Run:
```bash
# Kill processes on 8000 (Backend), 8002 (XTTS), and 5173 (Frontend)
fuser -k -9 8000/tcp 8002/tcp 5173/tcp
```
Then run `./scripts/run.sh` again.

### TTS Freezing
If TTS generation hangs:
1.  Check the terminal logs for `XTTS Service` errors.
2.  Ensure you have enough VRAM (approx 4GB-6GB for full stack).
3.  The service automatically logs detailed inference steps to helping debugging.

## 📄 License

[MIT License](LICENSE)

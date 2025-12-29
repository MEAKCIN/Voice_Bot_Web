# 🎙️ Voice Bot Web

A modern, real-time Voice Bot application featuring a sleek React frontend and a powerful Python backend. This project integrates Speech-to-Text (STT), Large Language Models (LLM), and Text-to-Speech (TTS) to create a seamless conversational experience.

![Voice Bot Interface](frontend/public/vite.svg) *Add a screenshot of your app here if possible*

## ✨ Features

- **Real-time Voice Interaction**: Talk to the bot and get instant spoken responses.
- **Multilingual Support**: Supports **English** and **Turkish** with automatic language detection and appropriate voice synthesis.
- **Modern UI**: Built with **React** and **TailwindCSS**, featuring glassmorphism and smooth animations.
- **Local AI Engines**:
  - **LLM**: Uses **Ollama** (running Qwen 2.5) for intelligence.
  - **STT**: Uses **Faster-Whisper** (`large-v3`) for accurate transcription.
  - **TTS**: Uses **XTTS v2** for high-quality, cloned voice synthesis.
- **Microservice Architecture**: Backend spawns a dedicated XTTS server for non-blocking audio generation.
- **Docker Support**: Containerized backend for easy deployment.

## 🚀 Prerequisites

Before running the project, ensure you have the following installed:

- **Python 3.11+**
- **Node.js 18+** & **npm**
- **Ollama**: [Download Ollama](https://ollama.com/) and ensure it's running (`ollama serve`).
- **GPU (Optional but Recommended)**: For faster local inference (CUDA support).

## 🛠️ Installation

1.  **Clone the Repository**
    ```bash
    git clone https://github.com/YOUR_USERNAME/Voice_Bot_Web.git
    cd Voice_Bot_Web
    ```

2.  **Backend Setup**
    ```bash
    # Create and activate virtual environment
    python3 -m venv .venv
    source .venv/bin/activate  # On Windows: .venv\Scripts\activate

    # Install dependencies
    pip install -r requirements.txt
    ```

3.  **Frontend Setup**
    ```bash
    cd frontend
    npm install
    ```

4.  **Model Setup**
    - The application will automatically attempt to pull the required Ollama model (`qwen2.5:latest`) and download XTTS models on first run.

## 🏃‍♂️ Usage

### Running Locally

1.  **Start Ollama** (if not running)
    ```bash
    ollama serve
    ```

2.  **Start the Backend**
    ```bash
    # From the project root
    source .venv/bin/activate
    python backend/main.py
    ```
    - The API will run on `http://localhost:8000`.
    - The XTTS server will start on `http://localhost:8002`.

3.  **Start the Frontend**
    ```bash
    # In a new terminal, from /frontend
    cd frontend
    npm run dev
    ```
    - Open `http://localhost:5173` in your browser.

### 🐳 Running with Docker

Build and run the backend container:

```bash
# Build the image
docker build -t voice-bot-backend .

# Run the container (Ensure Ollama is running on host or accessible network)
# Note: Accessing host Ollama from container requires network config
docker run --network host voice-bot-backend
```

## 📂 Project Structure

```
Voice_Bot_Web/
├── backend/            # FastAPI Main Server
│   └── main.py        # Entry point
├── frontend/           # React + Vite Application
├── models/             # Downloaded AI Models (Ignored in Git)
├── scripts/            # Helper scripts (run.sh, downloaders)
├── src/                # Core AI Logic Modules
│   ├── bot.py         # CLI Bot (Alternative entry)
│   ├── utils_llm.py   # Large Language Model Handler
│   ├── utils_stt.py   # Speech-to-Text Handler
│   └── xtts_server.py # Dedicated TTS Server
└── requirements.txt    # Python Dependencies
```

## 🤝 Contributing

Contributions are welcome! Please fork the repository and submit a pull request.

## 📄 License

[MIT License](LICENSE)

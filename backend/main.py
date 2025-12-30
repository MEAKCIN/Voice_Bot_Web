from fastapi import FastAPI, HTTPException, status, UploadFile, File, Form
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
import random
import sys
import os
import shutil
import base64
import subprocess
import time
from fastapi.middleware.cors import CORSMiddleware
from fastapi import UploadFile, File
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

# Add src to path
sys.path.append(os.path.join(os.path.dirname(__file__), ".."))

# Import Project Modules
from src.utils_stt import STTEngine
from src.utils_llm import LLMEngine
from src.utils_xtts_client import XTTSEngine

app = FastAPI()

# --- Initialize Real Bot Components ---
print("Initializing Real Bot Components...")
# Force CPU for stability due to apparent cuDNN conflicts causing core dumps on this machine
# Using CUDA for STT as requested
stt = STTEngine(device="cuda", compute_type="float16")
llm = LLMEngine()

# Start XTTS Server (logic from bot.py)
print("Starting XTTS Server...")
# Reuse logic to find python and script
# Assuming running from root
server_script = "src/xtts_server.py"
if not os.path.exists(server_script):
    server_script = "../src/xtts_server.py" 

python_exec = sys.executable
# Simple subprocess start
xtts_process = subprocess.Popen(
    [python_exec, server_script],
    stdout=sys.stdout,
    stderr=sys.stderr
)
# Wait briefly for startup
time.sleep(5) 
tts = XTTSEngine()


# Allow CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, set to specific origin
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Mock Data Models ---
class User(BaseModel):
    username: str
    password: str
    role: str # "admin" or "user"
    status: str = "active"

class UserCreate(BaseModel):
    username: str
    password: str
    role: str

class UserUpdate(BaseModel):
    username: Optional[str] = None
    password: Optional[str] = None
    role: Optional[str] = None

class LoginRequest(BaseModel):
    username: str
    password: str

class LoginResponse(BaseModel):
    token: str
    role: str
    username: str

class ChatRequest(BaseModel):
    message: str
    username: str

class ChatResponse(BaseModel):
    response: str

# --- Mock Database ---
users_db = [
    User(username="admin", password="password", role="admin"),
    User(username="user", password="password", role="user"),
]

# --- Endpoints ---

@app.post("/api/login", response_model=LoginResponse)
async def login(req: LoginRequest):
    user = next((u for u in users_db if u.username == req.username and u.password == req.password), None)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return {"token": "mock-token-123", "role": user.role, "username": user.username}

@app.get("/api/users", response_model=List[User])
async def get_users():
    return users_db

@app.post("/api/users", response_model=User)
async def create_user(user: UserCreate):
    if any(u.username == user.username for u in users_db):
        raise HTTPException(status_code=400, detail="User already exists")
    new_user = User(username=user.username, password=user.password, role=user.role)
    users_db.append(new_user)
    return new_user

@app.put("/api/users/{username}", response_model=User)
async def update_user(username: str, user_update: UserUpdate):
    user_idx = next((i for i, u in enumerate(users_db) if u.username == username), None)
    if user_idx is None:
        raise HTTPException(status_code=404, detail="User not found")
    
    current_user = users_db[user_idx]
    
    # Check if new username conflicts with existing user (if changing username)
    if user_update.username and user_update.username != username:
        if any(u.username == user_update.username for u in users_db):
            raise HTTPException(status_code=400, detail="Username already taken")
    
    updated_user = current_user.copy(update=user_update.dict(exclude_unset=True))
    users_db[user_idx] = updated_user
    return updated_user

@app.delete("/api/users/{username}")
async def delete_user(username: str):
    global users_db
    users_db = [u for u in users_db if u.username != username]
    return {"status": "success"}

@app.get("/api/stats")
async def get_stats():
    return {
        "active_users": len(users_db),
        "total_conversations": 1245,
        "server_load": f"{random.randint(10, 40)}%",
        "uptime": "24h 12m"
    }

@app.post("/api/chat", response_model=ChatResponse)
async def chat(req: ChatRequest):
    # Mock bot response
    responses = [
        "That's an interesting perspective on the Ottoman Empire.",
        "I can certainly help you with that query.",
        "Could you please repeat that? The audio triggers were unclear.",
        f"Hello {req.username}, I am listening."
    ]
    return {"response": random.choice(responses)}

@app.post("/api/voice-chat")
async def voice_chat(
    file: UploadFile = File(...), 
    username: str = Form("guest"), 
    language: str = Form("en")
):
    try:
        # 1. Save Uploaded Audio
        temp_filename = f"temp_{random.randint(0, 100000)}.webm" # Browser usually sends webm/ogg
        with open(temp_filename, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        # 2. STT (Transcribe)
        print(f"Transcribing {temp_filename} with hint [{language}]...")
        # STT engine expects path or file-like. We give path.
        # Use the provided language hint for better accuracy
        user_text, detected_lang = stt.transcribe(temp_filename, language=language)
        print(f"User ({detected_lang}): {user_text}")
        
        # Cleanup input file
        os.remove(temp_filename)
        
        if not user_text.strip():
            return {"user_text": "", "bot_text": "I didn't hear anything.", "audio_base64": None}

        # 3. LLM (Generate Response)
        # FORCE the language to match selection
        target_lang = language 
        
        if target_lang == "tr":
            llm.set_language("tr")
        else:
            llm.set_language("en")
            
        bot_response = ""
        # Accumulate streaming response
        for token in llm.chat(user_text):
            bot_response += token
            
        print(f"Bot: {bot_response}")
        
        # 4. TTS (Synthesize)
        # Speed 1.5 for faster response, slightly lower temperature for stability/naturalness
        audio_bytes = tts.synthesize_audio(bot_response, lang=target_lang, speed=1.5, temperature=0.7)
        
        audio_b64 = None
        if audio_bytes:
            audio_b64 = base64.b64encode(audio_bytes).decode('utf-8')
            
        return {
            "user_text": user_text, 
            "bot_text": bot_response, 
            "audio_base64": audio_b64,
            "language": target_lang
        }
        
    except Exception as e:
        print(f"Voice Chat Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# --- Serve Frontend (SPA) ---
# Determine path to frontend build
# 1. Env override
# 2. Local dev path relative to this file
frontend_dist = os.getenv("FRONTEND_DIST", os.path.join(os.path.dirname(__file__), "..", "frontend", "dist"))

if os.path.exists(frontend_dist):
    print(f"Serving frontend from {frontend_dist}")
    
    # Mount assets if they exist
    assets_path = os.path.join(frontend_dist, "assets")
    if os.path.exists(assets_path):
        app.mount("/assets", StaticFiles(directory=assets_path), name="assets")
        
    # Catch-all for SPA and root files
    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        # Check if file exists in dist (e.g., favicon.ico, robohash.png)
        file_path = os.path.join(frontend_dist, full_path)
        if os.path.isfile(file_path):
             return FileResponse(file_path)
             
        # Otherwise serve index.html
        index_path = os.path.join(frontend_dist, "index.html")
        if os.path.exists(index_path):
            return FileResponse(index_path)
        return {"error": "Frontend not found"}
else:
    print(f"Frontend dist not found at {frontend_dist}. Running in API-only mode.")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

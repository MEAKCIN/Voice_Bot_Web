from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging
from .api.endpoints import websocket
from .api.endpoints import auth
from .api.endpoints import stats

# Config Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("VoiceBot")

app = FastAPI(title="SNA Consulting Voice Bot")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(websocket.router)
app.include_router(auth.router)
app.include_router(stats.router)

@app.get("/health")
async def health_check():
    return {"status": "ok", "version": "2.0.0-modular"}

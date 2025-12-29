import sys
try:
    import lzma
except ImportError:
    try:
        from backports import lzma
        sys.modules['lzma'] = lzma
    except ImportError:
        pass

import os
import torch
import torch
# Monkeypatch torch.load to handle PyTorch 2.6+ secure default
# Coqui TTS relies on pickling custom objects
_original_load = torch.load
def unsafe_load(*args, **kwargs):
    if 'weights_only' not in kwargs:
        kwargs['weights_only'] = False
    return _original_load(*args, **kwargs)
torch.load = unsafe_load

import uvicorn
from fastapi import FastAPI, Response, HTTPException
from pydantic import BaseModel
import io
import numpy as np
import scipy.io.wavfile

import torchaudio
# Force soundfile backend by monkeypatching load
# This works around torchaudio 2.6 defaulting to missing torchcodec
_original_audio_load = torchaudio.load
def safe_audio_load(*args, **kwargs):
    kwargs['backend'] = 'soundfile'
    try:
        return _original_audio_load(*args, **kwargs)
    except Exception as e:
        print(f"Error in torchaudio.load with soundfile: {e}")
        # Last ditch: try without backend arg if soundfile fails?
        # But we know soundfile is what we want.
        raise e
torchaudio.load = safe_audio_load

# Import XTTS classes directly
from TTS.tts.configs.xtts_config import XttsConfig
from TTS.tts.models.xtts import Xtts

print("Initializing XTTS Server (Local)...")

DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
print(f"Device: {DEVICE}")

# Load Local Model
# path relative to src/xtts_server.py -> ../models/xtts_v2
MODEL_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "models", "xtts_v2")
CONFIG_PATH = os.path.join(MODEL_PATH, "config.json")

print(f"Loading model from {MODEL_PATH}...")
try:
    config = XttsConfig()
    config.load_json(CONFIG_PATH)
    model = Xtts.init_from_config(config)
    model.load_checkpoint(config, checkpoint_dir=MODEL_PATH, eval=True)
    try:
        model.to(DEVICE)
    except Exception as e:
        print(f"Failed to move model to {DEVICE} ({e}), falling back to CPU")
        DEVICE = "cpu"
        model.to(DEVICE)
except Exception as e:
    print(f"Error initializing Local XTTS: {e}")
    exit(1)

app = FastAPI()

class SynthesisRequest(BaseModel):
    text: str
    language: str = "en"
    speaker_wav: str = "speaker.wav"
    temperature: float = 0.75
    length_penalty: float = 1.0
    repetition_penalty: float = 5.0
    top_k: int = 50
    top_p: float = 0.85
    speed: float = 1.0

@app.post("/synthesize")
async def synthesize(req: SynthesisRequest):
    if not req.text.strip():
        return Response(content=b"", media_type="audio/wav")
    
    # Verify speaker file
    if not os.path.exists(req.speaker_wav):
        raise HTTPException(status_code=400, detail="Speaker wav not found")

    print(f"Synthesizing [{req.language}]: {req.text[:50]}...")
    
    try:
        # XTTS Inference using model directly
        # We need to compute latents first
        gpt_cond_latent, speaker_embedding = model.get_conditioning_latents(
            audio_path=[req.speaker_wav]
        )
        
        # Inference
        out = model.inference(
            req.text,
            req.language,
            gpt_cond_latent,
            speaker_embedding,
            enable_text_splitting=True,
            temperature=req.temperature,
            length_penalty=req.length_penalty,
            repetition_penalty=req.repetition_penalty,
            top_k=req.top_k,
            top_p=req.top_p,
            speed=req.speed
        )
        
        # Convert to int16 compatible with aplay/standard wav
        wav_norm = np.array(out['wav'])
        wav_int16 = (wav_norm * 32767).clip(-32768, 32767).astype(np.int16)
        
        buffer = io.BytesIO()
        scipy.io.wavfile.write(buffer, 24000, wav_int16)
        buffer.seek(0)
        
        return Response(content=buffer.read(), media_type="audio/wav")
        
    except Exception as e:
        print(f"Inference Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8002)

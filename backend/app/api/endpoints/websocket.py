from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import logging
import numpy as np
import json
from ...services.vad import VADService
from ...services.pipeline import VoicePipeline

router = APIRouter()
logger = logging.getLogger("WebSocket")

# Globals for now (could be dependency injected)
pipeline = VoicePipeline()
vad_service = VADService()

@router.websocket("/websocket/offer")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    logger.info("WebSocket connected")
    
    # Audio Buffering State
    SAMPLE_RATE = 16000
    CHANNELS = 1
    # VAD works on chunks. We buffer input.
    audio_buffer = [] 
    silence_frames = 0
    is_speech_active = False
    
    # Concurrency State
    import asyncio
    current_response_task = None

    try:
        while True:
            message = await websocket.receive()
            
            # 1. Handle Configuration Messages (Text)
            if "text" in message:
                try:
                    data = json.loads(message["text"])
                    if data.get("type") == "config":
                        lang = data.get("lang")
                        pipeline.set_language(lang)
                except Exception as e:
                    logger.error(f"Config Error: {e}")
                continue
            
            # 2. Handle Audio Data (Binary)
            if "bytes" not in message:
                continue

            # Convert raw bytes (Int16) to Float32
            raw_audio = np.frombuffer(message["bytes"], dtype=np.int16)
            float_audio = raw_audio.astype(np.float32) / 32768.0

            # VAD Check (Iterate over 4096 sample chunk in 512 steps)
            chunk_size = 512
            is_speech_chunk = False
            
            for i in range(0, len(float_audio), chunk_size):
                sub_chunk = float_audio[i:i+chunk_size]
                if len(sub_chunk) == chunk_size:
                    speech_detected, _ = vad_service.is_speech(sub_chunk)
                    if speech_detected:
                        is_speech_chunk = True
                        
            if is_speech_chunk:
                silence_frames = 0
                
                # RISING EDGE: User started speaking
                if not is_speech_active:
                     is_speech_active = True
                     logger.info("Barge-in detected: Interrupting...")
                     await websocket.send_text(json.dumps({"type": "interrupt"}))
                     
                     # Cancel previous response generation if active
                     if current_response_task and not current_response_task.done():
                         current_response_task.cancel()
                         try:
                             await current_response_task
                         except asyncio.CancelledError:
                             logger.info("Previous response canceled.")
                
                audio_buffer.append(float_audio)
            else:
                if is_speech_active:
                    silence_frames += 1
                    audio_buffer.append(float_audio) # Keep trailing silence for natural cut
                    
                    if silence_frames > 3: 
                        # End of turn
                        full_audio = np.concatenate(audio_buffer)
                        
                        # Reset State
                        audio_buffer = []
                        is_speech_active = False
                        silence_frames = 0
                        
                        # Process in background task (Non-blocking)
                        if current_response_task and not current_response_task.done():
                             current_response_task.cancel()
                        
                        current_response_task = asyncio.create_task(pipeline.process_turn(full_audio, websocket))

    except WebSocketDisconnect:
        logger.info("WebSocket disconnected")
        if current_response_task:
            current_response_task.cancel()
    except Exception as e:
        logger.error(f"WebSocket Error: {e}")


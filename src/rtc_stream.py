import numpy as np
import asyncio
import logging
from fastapi import WebSocket, WebSocketDisconnect
from typing import List

import sys
import os
# Add src to path
sys.path.append(os.path.join(os.path.dirname(__file__), ".."))

from src.utils_stt import STTEngine
from src.utils_llm import LLMEngine
from src.utils_xtts_client import XTTSEngine
from src.utils_vad import VADDetector 

# Setup Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("RTC_Stream_Manual")

# Initialize Engines
print("Initializing Manual RTC Engines...")
# FORCE GPU for STT - Use 'large-v3-turbo' (float16 for GPU)
stt = STTEngine(model_size="large-v3-turbo", device="cuda", compute_type="float16") 
llm = LLMEngine()
tts = XTTSEngine()
vad = VADDetector()

import scipy.io.wavfile

# ... (inside process_turn) ...

async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    logger.info("WebSocket Accepted")
    
    # State
    speech_buffer = [] # Float32 chunks at 24kHz for STT
    silence_counter = 0
    in_speech_phase = False
    SILENCE_THRESHOLD_MS = 1000 # 1s
    SAMPLE_RATE = 24000 # Frontend sends 24k
    
    current_language = None # "en" or "tr" or None (auto)
    
    # VAD buffer (16kHz) - Silero requires exactly 512 samples per call
    vad_audio_buffer = np.array([], dtype=np.float32)
    VAD_CHUNK_SIZE = 512  # Required by Silero for 16kHz
    
    try:
        while True:
            # Receive message (text or bytes)
            message = await websocket.receive()
            
            if "text" in message:
                try:
                    import json
                    data = json.loads(message["text"])
                    if data.get("type") == "config":
                        lang = data.get("lang")
                        if lang in ["en", "tr"]:
                            current_language = lang
                            logger.info(f"Language forced to: {current_language}")
                            # Pre-set LLM system prompt immediately
                            llm.set_language(current_language)
                    continue
                except Exception as e:
                    logger.error(f"Config Error: {e}")
                    continue
            
            if "bytes" not in message:
                continue
                
            # Process Audio Bytes
            data = message["bytes"]
            
            # Convert to numpy float32 for processing
            audio_int16 = np.frombuffer(data, dtype=np.int16)
            # Normalize
            audio_float32 = audio_int16.astype(np.float32) / 32768.0
            
            # Resample 24kHz -> 16kHz for VAD
            import scipy.signal
            num_samples_target = int(len(audio_float32) * 16000 / SAMPLE_RATE)
            audio_for_vad = scipy.signal.resample(audio_float32, num_samples_target)
            
            # Append to VAD buffer
            vad_audio_buffer = np.concatenate([vad_audio_buffer, audio_for_vad])
            
            # Process all complete 512-sample windows
            is_speech = False
            max_prob = 0.0
            chunks_processed = 0
            
            while len(vad_audio_buffer) >= VAD_CHUNK_SIZE:
                vad_chunk = vad_audio_buffer[:VAD_CHUNK_SIZE]
                vad_audio_buffer = vad_audio_buffer[VAD_CHUNK_SIZE:]
                
                chunk_is_speech, prob = vad.is_speech(vad_chunk, sr=16000)
                chunks_processed += 1
                if prob > max_prob:
                    max_prob = prob
                if chunk_is_speech:
                    is_speech = True
            
            # Only log state transitions, not every chunk (too verbose)
            # if chunks_processed > 0:
            #     logger.info(f"Processed {chunks_processed} VAD chunks. Max Prob: {max_prob:.2f}. Speech: {is_speech}")

            if is_speech:
                if not in_speech_phase:
                     # logger.info("Speech START detected.")
                     # Send Interrupt Signal
                     await websocket.send_text('{"type": "interrupt"}')
                in_speech_phase = True
                silence_counter = 0
                speech_buffer.append(audio_float32)
            else:
                if in_speech_phase:
                    # Silence after speech
                    chunk_duration_ms = (len(audio_float32) / SAMPLE_RATE) * 1000
                    silence_counter += chunk_duration_ms
                    
                    # Log silence progress
                    # if silence_counter % 500 < chunk_duration_ms * 2: # Approx log every 500ms
                    #     logger.info(f"Silence: {silence_counter:.0f}ms / {SILENCE_THRESHOLD_MS}ms")
                    
                    speech_buffer.append(audio_float32)
                    
                    if silence_counter > SILENCE_THRESHOLD_MS:
                        # --- Turn End Detected ---
                        # logger.info("Turn End Detected. Processing...")
                        
                        full_audio = np.concatenate(speech_buffer)
                        
                        # Use an async processing task to not block receive?
                        # For now, blocking is safer to avoid overlapping turns.
                        await process_turn(full_audio, websocket, current_language)
                        
                        # Reset
                        speech_buffer = []
                        silence_counter = 0
                        in_speech_phase = False
                else:
                    # Just silence, ignore or buffer small context? 
                    # Ignore
                    pass

    except WebSocketDisconnect:
        logger.info("WebSocket Disconnected")
    except Exception as e:
        logger.error(f"WebSocket Error: {e}")

async def process_turn(audio_float32, websocket: WebSocket, forced_language=None):
    # Debug: Save audio
    try:
        debug_wav = (audio_float32 * 32767).astype(np.int16)
        scipy.io.wavfile.write("debug_input.wav", 24000, debug_wav)
        # logger.info("Saved debug_input.wav")
    except Exception as e:
        logger.error(f"Failed to save debug wav: {e}")

    # 1. STT
    try:
        # Transcribe
        # logger.info("Transcribing...")
        user_text, detected_lang = stt.transcribe(audio_float32, language=forced_language)
        
        # If forced, override detected_lang for logic downstream
        if forced_language:
            detected_lang = forced_language
            
        logger.info(f"User ({detected_lang}): {user_text}")
        
        if user_text.strip():
             # Send transcription to frontend
             await websocket.send_text(f'{{"type": "user_transcription", "text": "{user_text.replace(chr(34), chr(39))}"}}')
        
        if not user_text.strip():
            return

        # 2. LLM
        if detected_lang == "tr":
            llm.set_language("tr")
            target_lang = "tr"
        else:
            llm.set_language("en")
            target_lang = "en"
            
        current_sentence = ""
        for token in llm.chat(user_text):
            current_sentence += token
            # Sentence Split
            if token in [".", "!", "?", "\n"]:
                if current_sentence.strip():
                    await synthesize_and_send(current_sentence, target_lang, websocket)
                    # Send text chunk to frontend (optional, or send full sentence)
                    await websocket.send_text(f'{{"type": "ai_response", "text": "{current_sentence.replace(chr(34), chr(39))}"}}')
                    current_sentence = ""
        
        # Final
        if current_sentence.strip():
            await synthesize_and_send(current_sentence, target_lang, websocket)
            await websocket.send_text(f'{{"type": "ai_response", "text": "{current_sentence.replace(chr(34), chr(39))}"}}')
            
    except Exception as e:
        logger.error(f"Processing Error: {e}")

async def synthesize_and_send(text, lang, websocket: WebSocket):
    # logger.info(f"Synthesizing: {text[:30]}...")
    try:
        # XTTS synthesis (async)
        wav_bytes = await tts.synthesize_audio_async(text, lang=lang, speed=1.2)
        if wav_bytes:
             # Send raw WAV/PCM bytes back
             # Frontend (VoiceBot.jsx) expects array buffer (which calls decodeAudioData)
             # decodeAudioData handles WAV headers fine.
             await websocket.send_bytes(wav_bytes)
    except Exception as e:
        logger.error(f"TTS Error: {e}")

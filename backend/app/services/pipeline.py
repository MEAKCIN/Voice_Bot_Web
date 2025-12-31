import numpy as np
import scipy.io.wavfile
import logging
import base64
import json
from .stt import STTService
from .llm import LLMService
from .tts import TTSService
from .stats import StatsService

logger = logging.getLogger("VoicePipeline")
logger.setLevel(logging.INFO)

class VoicePipeline:
    def __init__(self):
        self.stt = STTService()
        self.llm = LLMService()
        self.tts = TTSService()
        self.stats = StatsService()
        self.forced_language = 'tr' # Default

    def set_language(self, lang):
        if lang in ['tr', 'en']:
            self.forced_language = lang
            self.llm.set_language(lang)
            logger.info(f"Pipeline language forced to: {lang}")

    async def process_turn(self, audio_float32, websocket):
        """
        Orchestrates STT -> LLM -> TTS pipeline for a single turn.
        """
        # Debug: Save audio (Optional, can be removed in prod)
        try:
            debug_wav = (audio_float32 * 32767).astype(np.int16)
            scipy.io.wavfile.write("debug_input.wav", 16000, debug_wav)
        except Exception as e:
            logger.error(f"Failed to save debug wav: {e}")

        # 1. STT
        detected_lang = self.forced_language
        user_text, _ = self.stt.transcribe(audio_float32, language=detected_lang)
        
        logger.info(f"User ({detected_lang}): {user_text}")
        
        if not user_text.strip():
            return
            
        # Send User text to frontend
        await websocket.send_text(json.dumps({
            "type": "user_transcription", 
            "text": user_text.replace('"', "'")
        }))

        # 2. LLM Streaming
        full_response = ""
        sentence_buffer = ""
        
        # Async generator would be better for TTS streaming, but for now we iterate
        for token in self.llm.chat(user_text):
            full_response += token
            sentence_buffer += token
            
            # Simple sentence detection for TTS streaming (improves latency perception)
            if token in [".", "!", "?", "\n"] and len(sentence_buffer) > 10:
                await self._synthesize_and_send(sentence_buffer, websocket, detected_lang)
                sentence_buffer = ""

        # Send remaining buffer
        if sentence_buffer.strip():
            await self._synthesize_and_send(sentence_buffer, websocket, detected_lang)

        # Send full text to frontend for chat log
        await websocket.send_text(json.dumps({
            "type": "ai_response", 
            "text": full_response.replace('"', "'")
        }))
        
        # -- Track Stats --
        # Estimate: User tokens (approx words * 1.3) + AI tokens (words * 1.3)
        # Duration: Rough estimate based on response length for audio duration
        estimated_tokens = int((len(user_text.split()) + len(full_response.split())) * 1.3)
        estimated_duration = len(full_response) * 0.08 # Approx 0.08s per character for speech
        
        self.stats.record_usage(estimated_tokens, estimated_duration)
        
        logger.info(f"AI: {full_response}")

    async def _synthesize_and_send(self, text, websocket, lang):
        audio_bytes = await self.tts.synthesize_audio_async(text, lang=lang, speed=1.2)
        if audio_bytes:
             await websocket.send_bytes(audio_bytes)

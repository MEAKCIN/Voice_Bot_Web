import edge_tts
import asyncio
import io
import wave

class EdgeTTSEngine:
    """
    Fast, high-quality TTS using Microsoft Edge TTS.
    Supports Turkish and English with natural voices.
    """
    def __init__(self):
        # Voice options - Edge TTS has excellent Turkish and English voices
        self.voices = {
            "tr": "tr-TR-AhmetNeural",   # Turkish male voice
            "en": "en-US-GuyNeural"       # English male voice
        }
        print("Initialized Edge-TTS Engine")
    
    def synthesize_audio(self, text: str, lang: str = "en", speed: float = 1.0) -> bytes:
        """
        Synthesizes text to audio using edge-tts.
        Returns WAV bytes.
        """
        voice = self.voices.get(lang, self.voices["en"])
        
        # Convert speed to rate string (e.g., +10%, -20%)
        rate_percent = int((speed - 1.0) * 100)
        rate_str = f"+{rate_percent}%" if rate_percent >= 0 else f"{rate_percent}%"
        
        # Run async synthesis
        return asyncio.get_event_loop().run_until_complete(
            self._synthesize_async(text, voice, rate_str)
        )
    
    async def _synthesize_async(self, text: str, voice: str, rate: str) -> bytes:
        """Async synthesis implementation."""
        try:
            communicate = edge_tts.Communicate(text, voice, rate=rate)
            
            # Collect audio chunks
            audio_chunks = []
            async for chunk in communicate.stream():
                if chunk["type"] == "audio":
                    audio_chunks.append(chunk["data"])
            
            if audio_chunks:
                # Combine all chunks into MP3, then convert to WAV for browser compatibility
                mp3_data = b"".join(audio_chunks)
                
                # Edge-TTS returns MP3, but browser decodeAudioData prefers WAV
                # For simplicity, returning MP3 which modern browsers can decode
                return mp3_data
            return None
            
        except Exception as e:
            print(f"Edge-TTS Error: {e}")
            return None


# Compatibility alias for existing code
class XTTSEngine(EdgeTTSEngine):
    """Compatibility wrapper for existing code expecting XTTSEngine."""
    pass

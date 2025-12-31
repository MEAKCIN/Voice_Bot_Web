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
            "tr": "tr-TR-EmelNeural",       # Turkish Female (Clearer)
            "en": "en-US-EmmaMultilingualNeural" # English Female (Copilot/Conversational)
        }
        print("Initialized Edge-TTS Engine")
    
    async def synthesize_audio_async(self, text: str, lang: str = "en", speed: float = 1.0, temperature: float = 0.7) -> bytes:
        """
        Async synthesis implementation (Public API).
        """
        try:
            voice = self.voices.get(lang, self.voices["en"])
            # Convert speed to rate string (e.g., +10%, -20%)
            rate_percent = int((speed - 1.0) * 100)
            rate_str = f"+{rate_percent}%" if rate_percent >= 0 else f"{rate_percent}%"

            communicate = edge_tts.Communicate(text, voice, rate=rate_str)
            
            # Collect audio chunks
            audio_chunks = []
            async for chunk in communicate.stream():
                if chunk["type"] == "audio":
                    audio_chunks.append(chunk["data"])
            
            if audio_chunks:
                # Combine all chunks into MP3
                mp3_data = b"".join(audio_chunks)
                return mp3_data
            return None
            
        except Exception as e:
            print(f"Edge-TTS Error: {e}")
            return None

    def synthesize_audio(self, text: str, lang: str = "en", speed: float = 1.0, temperature: float = 0.7) -> bytes:
        """
        Synthesizes text to audio using edge-tts.
        Returns WAV bytes.
        """
        try:
            loop = asyncio.get_event_loop()
            if loop.is_running():
                raise RuntimeError("Cannot call synchronous synthesize_audio from an async loop. Use 'await synthesize_audio_async()' instead.")
            return loop.run_until_complete(
                self.synthesize_audio_async(text, lang, speed, temperature)
            )
        except RuntimeError:
             # Fallback for when there is no loop
             return asyncio.run(self.synthesize_audio_async(text, lang, speed, temperature))


# Compatibility alias for existing code
class XTTSEngine(EdgeTTSEngine):
    """Compatibility wrapper for existing code expecting XTTSEngine."""
    pass

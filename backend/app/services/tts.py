import edge_tts
import asyncio

class TTSService:
    """
    Fast, high-quality TTS using Microsoft Edge TTS.
    """
    def __init__(self):
        self.voices = {
            "tr": "tr-TR-EmelNeural",       
            "en": "en-US-EmmaMultilingualNeural" 
        }
        print("Initialized Edge-TTS Service")
    
    async def synthesize_audio_async(self, text: str, lang: str = "en", speed: float = 1.0) -> bytes:
        try:
            voice = self.voices.get(lang, self.voices["en"])
            rate_percent = int((speed - 1.0) * 100)
            rate_str = f"+{rate_percent}%" if rate_percent >= 0 else f"{rate_percent}%"

            communicate = edge_tts.Communicate(text, voice, rate=rate_str)
            
            audio_chunks = []
            async for chunk in communicate.stream():
                if chunk["type"] == "audio":
                    audio_chunks.append(chunk["data"])
            
            if audio_chunks:
                return b"".join(audio_chunks)
            return None
            
        except Exception as e:
            print(f"Edge-TTS Error: {e}")
            return None

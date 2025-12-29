import subprocess
import requests
import os

class XTTSEngine:
    def __init__(self, server_url="http://127.0.0.1:8002"):
        self.server_url = server_url
        print("Initialized XTTS Engine (Client)")

    def speak(self, text, lang="en"):
        if not text:
            return
            
        try:
            # Map lang codes if necessary
            # XTTS supports: en, es, fr, de, it, pt, pl, tr, ru, nl, cs, ar, zh-cn, ja, ko, hu
            # Whisper returns 'en', 'tr' etc. mostly matching.
            
            # Determine speaker file
            # Default to generic speaker.wav
            speaker_file = "speaker.wav"
            
            # Use specific samples if available
            sample_dir = os.path.join(os.getcwd(), "models/xtts_v2/samples")
            lang_code = lang.lower()
            if lang_code == "tr":
                candidate = os.path.join(sample_dir, "tr_sample.wav")
                if os.path.exists(candidate):
                    speaker_file = candidate
            elif lang_code == "en":
                candidate = os.path.join(sample_dir, "en_sample.wav")
                if os.path.exists(candidate):
                    speaker_file = candidate
            
            payload = {
                "text": text,
                "language": lang,
                "speaker_wav": speaker_file
            }
            
            # print(f"XTTS Request ({lang}): {text[:30]}...")
            
            # Use requests to get audio
            with requests.post(f"{self.server_url}/synthesize", json=payload, stream=True) as response:
                response.raise_for_status()
                
                # Play streaming audio
                # For now, it returns full wav. Stream to aplay.
                p = subprocess.Popen(['aplay', '-q'], stdin=subprocess.PIPE)
                for chunk in response.iter_content(chunk_size=4096):
                    if chunk:
                        p.stdin.write(chunk)
                p.stdin.flush()
                p.stdin.close()
                p.wait()
            
        except Exception as e:
            print(f"XTTS Error: {e}")

    def synthesize_audio(self, text, lang="en"):
        """Returns the audio bytes (wav) directly."""
        if not text:
            return None
            
        try:
            # Determine speaker file similar to speak()
            speaker_file = "speaker.wav"
            sample_dir = os.path.join(os.getcwd(), "models/xtts_v2/samples")
            lang_code = lang.lower()
            if lang_code == "tr":
                candidate = os.path.join(sample_dir, "tr_sample.wav")
                if os.path.exists(candidate):
                    speaker_file = candidate
            elif lang_code == "en":
                candidate = os.path.join(sample_dir, "en_sample.wav")
                if os.path.exists(candidate):
                    speaker_file = candidate
            
            payload = {
                "text": text,
                "language": lang,
                "speaker_wav": speaker_file
            }
            
            with requests.post(f"{self.server_url}/synthesize", json=payload, stream=False) as response:
                response.raise_for_status()
                return response.content
            
        except Exception as e:
            print(f"XTTS Synthesis Error: {e}")
            return None

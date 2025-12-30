import subprocess
import requests
import os

class XTTSEngine:
    def __init__(self, server_url="http://127.0.0.1:8002"):
        self.server_url = server_url
        self.current_process = None
        self.is_stopped = False
        print("Initialized XTTS Engine (Client)")

    def stop(self):
        """Stops the current audio playback immediately."""
        self.is_stopped = True
        if self.current_process:
            try:
                self.current_process.terminate()
                self.current_process.wait(timeout=0.5)
            except Exception as e:
                print(f"Error stopping audio: {e}")
            finally:
                self.current_process = None

    def speak(self, text, lang="en"):
        if not text:
            return
            
        self.is_stopped = False
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
                self.current_process = subprocess.Popen(['aplay', '-q'], stdin=subprocess.PIPE)
                
                try:
                    for chunk in response.iter_content(chunk_size=4096):
                        if self.is_stopped:
                            break
                        if chunk and self.current_process and self.current_process.stdin:
                            self.current_process.stdin.write(chunk)
                except (BrokenPipeError, OSError):
                    # Process likely killed by stop()
                    pass
                finally:
                    if self.current_process:
                        try:
                            if self.current_process.stdin:
                                self.current_process.stdin.flush()
                                self.current_process.stdin.close()
                            self.current_process.wait()
                        except (BrokenPipeError, OSError):
                            pass
                        self.current_process = None
            
        except requests.exceptions.RequestException as e:
            # Only print if not manually stopped
            if not self.is_stopped:
                print(f"XTTS Network Error: {e}")
        except Exception as e:
            if not self.is_stopped:
                print(f"XTTS Error: {e}")

    def synthesize_audio(self, text, lang="en", **kwargs):
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
                "speaker_wav": speaker_file,
                **kwargs
            }
            
            with requests.post(f"{self.server_url}/synthesize", json=payload, stream=False) as response:
                response.raise_for_status()
                return response.content
            
        except Exception as e:
            print(f"XTTS Synthesis Error: {e}")
            return None

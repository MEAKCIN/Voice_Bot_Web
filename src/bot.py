import subprocess
import numpy as np
import threading
import queue
import time
import sys
import os
from colorama import Fore, Style, init

from utils_vad import VADDetector
from utils_stt import STTEngine
from utils_llm import LLMEngine
from utils_xtts_client import XTTSEngine
import time
import subprocess
import signal

# Initialize Colorama
init()

# Constants
SAMPLE_RATE = 16000
BLOCK_SIZE = 512 # ~32ms
SILENCE_THRESHOLD_MS = 1000 # 1 second of silence to stop recording

class VoiceBot:
    def __init__(self):
        print(Fore.CYAN + "Initializing Voice Bot..." + Style.RESET_ALL)
        
        # Initialize Components
        self.vad = VADDetector()
        
        # Load STT
        self.stt = STTEngine()
        
        # Load LLM
        self.llm = LLMEngine()
        
        # Start XTTS Server
        print(Fore.CYAN + "Starting XTTS Server..." + Style.RESET_ALL)
        self.cleanup_port(8002) # Cleanup previous instances
        # We assume running from root
        server_script = "src/xtts_server.py"
        if not os.path.exists(server_script):
             # Fallback if running from src
             server_script = "xtts_server.py"

        # Determine Python Executable for XTTS Server
        # Check for dedicated venv first, otherwise use current interpreter
        xtts_venv_python = os.path.join(os.getcwd(), ".venv_xtts", "bin", "python")
        if os.path.exists(xtts_venv_python):
             python_exec = xtts_venv_python
             print(Fore.CYAN + f"Using dedicated XTTS env: {python_exec}" + Style.RESET_ALL)
        else:
             python_exec = sys.executable
             print(Fore.CYAN + f"Using current python: {python_exec}" + Style.RESET_ALL)

        self.xtts_server_process = subprocess.Popen(
            [python_exec, server_script],
            stdout=sys.stdout,
            stderr=sys.stderr
        )
        # Wait for server to warm up (smart wait)
        self.wait_for_server()
        

        self.tts = XTTSEngine()
        
        self.is_listening = False
        self.speech_buffer = [] # List of numpy arrays
        self.silence_counter = 0
        self.in_speech_phase = False
        self.record_process = None
        self.session_language = None # "en" or "tr"

    def select_language(self):
        print(Fore.CYAN + "Requesting Language Selection..." + Style.RESET_ALL)
        
        # Audio cues
        self.tts.speak("Please say English to select English.", lang="en")
        time.sleep(0.5)
        self.tts.speak("Türkçe seçmek için lütfen Türkçe deyin.", lang="tr")
        
        print(Fore.GREEN + "Listening for language selection..." + Style.RESET_ALL)
        
        # Temporary loop just for language selection
        # reusing similar logic but simpler
        while self.session_language is None:
            # We need to capture one turn
            # For simplicity, we can block read until speech
            # This is complex to reuse the async loop logic. 
            # We'll just run a mini-loop here using the same record_process if active
            
            # Start recording if not started
            if self.record_process is None:
                self.start_recording()
                
            raw_data = self.record_process.stdout.read(BLOCK_SIZE * 2)
            if not raw_data: break
            
            audio_int16 = np.frombuffer(raw_data, dtype=np.int16)
            audio_float32 = audio_int16.astype(np.float32) / 32768.0
            
            is_speech, _ = self.vad.is_speech(audio_float32, sr=SAMPLE_RATE)
            
            if is_speech:
                self.in_speech_phase = True
                self.silence_counter = 0
                self.speech_buffer.append(audio_float32)
            else:
                if self.in_speech_phase:
                    self.silence_counter += (BLOCK_SIZE / SAMPLE_RATE) * 1000
                    self.speech_buffer.append(audio_float32)
                    
                    if self.silence_counter > SILENCE_THRESHOLD_MS:
                        # Process selection
                        full_audio = np.concatenate(self.speech_buffer)
                        text, lang = self.stt.transcribe(full_audio)
                        print(f"Detected: {text} ({lang})")
                        
                        text_lower = text.lower()
                        if "english" in text_lower or lang == "en":
                            self.session_language = "en"
                            self.tts.speak("English selected. How can I help you?", lang="en")
                        elif "türkçe" in text_lower or "turkish" in text_lower or lang == "tr":
                            self.session_language = "tr"
                            self.tts.speak("Türkçe seçildi. Size nasıl yardımcı olabilirim?", lang="tr")
                        else:
                             self.tts.speak("I didn't understand. Please say English or Türkçe.", lang="en")
                        
                        self.reset_state(quiet=True)
                        if self.session_language:
                            # Update LLM
                            self.llm.set_language(self.session_language)
                            return

    def start_recording(self):
        try:
            self.record_process = subprocess.Popen(
                ["arecord", "-f", "S16_LE", "-r", str(SAMPLE_RATE), "-c", "1", "-t", "raw", "-q"],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                bufsize=BLOCK_SIZE * 2
            )
        except Exception as e:
            print(f"Error starting arecord: {e}")

    def process_loop(self):
        # 1. Select Language
        self.select_language()
        
        print(Fore.GREEN + f"Bot is ready ({self.session_language})! Speak into the microphone." + Style.RESET_ALL)
        
        if self.record_process is None:
             self.start_recording()

        while True:
            # Read raw bytes
            raw_data = self.record_process.stdout.read(BLOCK_SIZE * 2)
            if not raw_data or len(raw_data) < BLOCK_SIZE * 2:
                break

            # Convert to float32 for VAD
            audio_int16 = np.frombuffer(raw_data, dtype=np.int16)
            audio_float32 = audio_int16.astype(np.float32) / 32768.0

            # VAD Check
            is_speech, prob = self.vad.is_speech(audio_float32, sr=SAMPLE_RATE)
            
            # State Machine
            if is_speech:
                self.in_speech_phase = True
                self.silence_counter = 0
                self.speech_buffer.append(audio_float32)
            else:
                if self.in_speech_phase:
                    self.silence_counter += (BLOCK_SIZE / SAMPLE_RATE) * 1000 # ms
                    self.speech_buffer.append(audio_float32) # Keep trailing silence
                    
                    if self.silence_counter > SILENCE_THRESHOLD_MS:
                        # User stopped speaking
                        self.handle_turn()
                        self.reset_state()
    
    def reset_state(self, quiet=False):
        self.in_speech_phase = False
        self.speech_buffer = []
        self.silence_counter = 0
        if not quiet:
            print(Fore.GREEN + "\nListening..." + Style.RESET_ALL)

    def handle_turn(self):
        print(Fore.YELLOW + "\nProcessing..." + Style.RESET_ALL)
        
        # 1. Prepare Audio
        full_audio = np.concatenate(self.speech_buffer)
        
        # 2. STT
        print(Fore.BLUE + "Transcribing..." + Style.RESET_ALL)
        # We can ignore detected lang here and force session lang if we want strict mode
        user_text, detected_lang = self.stt.transcribe(full_audio)
        
        if not user_text.strip():
            print("No speech detected or empty transcription.")
            return

        print(Fore.WHITE + f"User ({self.session_language}): {user_text}" + Style.RESET_ALL)
        
        # 3. LLM & TTS Streaming
        print(Fore.MAGENTA + "Bot: " + Style.RESET_ALL, end="", flush=True)
        
        current_sentence = ""
        for token in self.llm.chat(user_text):
            print(token, end="", flush=True)
            current_sentence += token
            
            # Simple heuristic for sentence end
            if token in [".", "!", "?", "\n"]:
                self.tts.speak(current_sentence, lang=self.session_language)
                current_sentence = ""
        
        # Flush remaining
        if current_sentence:
            self.tts.speak(current_sentence, lang=self.session_language)
            
        print() # Newline

    def wait_for_server(self, port=8002, timeout=120):
        print(Fore.CYAN + f"Waiting for XTTS Server on port {port}..." + Style.RESET_ALL)
        start_time = time.time()
        while time.time() - start_time < timeout:
            try:
                import socket
                with socket.create_connection(("127.0.0.1", port), timeout=1):
                    print(Fore.GREEN + "\nServer is ready!" + Style.RESET_ALL)
                    return True
            except (ConnectionRefusedError, OSError):
                time.sleep(2)
                print(".", end="", flush=True)
        print(Fore.RED + "\nServer timed out!" + Style.RESET_ALL)
        return False 


    def cleanup_port(self, port):
        """Kills any process listening on the specified port"""
        try:
            # Find process ID
            result = subprocess.run(["lsof", "-t", "-i", f":{port}"], capture_output=True, text=True)
            pids = result.stdout.strip().split('\n')
            for pid in pids:
                if pid:
                    print(Fore.YELLOW + f"Killing zombie process {pid} on port {port}..." + Style.RESET_ALL)
                    os.kill(int(pid), signal.SIGKILL)
        except Exception as e:
            print(f"Error cleaning up port {port}: {e}")

if __name__ == "__main__":
    bot = VoiceBot()
    try:
        bot.process_loop()
    except KeyboardInterrupt:
        print("\nExiting...")
        if bot.record_process:
            bot.record_process.terminate()
        if hasattr(bot, 'xtts_server_process') and bot.xtts_server_process:
            bot.xtts_server_process.terminate()

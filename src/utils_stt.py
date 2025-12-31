from faster_whisper import WhisperModel
import os

class STTEngine:
    def __init__(self, model_size="large-v3-turbo", device="cpu", compute_type="int8"):
        try:
             print(f"Loading Whisper model ({model_size}) on {device}...")
             self.model = WhisperModel(model_size, device=device, compute_type=compute_type)
        except Exception as e:
              # Fallback logic still useful if someone explicitly passes cuda
              print(f"Failed to load on {device} ({e}), falling back to CPU...")
              self.model = WhisperModel(model_size, device="cpu", compute_type="int8")
        print("Whisper model loaded.")

    def transcribe(self, audio_data, language=None):
        """
        Transcribes audio data using faster-whisper.
        audio_data: Valid input for faster-whisper (file path or binary-like object)
        """
        # faster-whisper expects a file path or a file-like object. 
        # If passing raw bytes/buffer, ensure it's wrapped or saved.
        # Here we assume audio_data is a file path or BytesIO for simplicity in this wrapper
        # or a numpy array if supported (faster-whisper supports ndarray).
        
        segments, info = self.model.transcribe(
            audio_data, 
            beam_size=5, 
            language=language,
            task="transcribe",
            vad_filter=True,
            vad_parameters=dict(min_silence_duration_ms=500)
        )
        
        text = ""
        for segment in segments:
            text += segment.text + " "
            
        return text.strip(), info.language

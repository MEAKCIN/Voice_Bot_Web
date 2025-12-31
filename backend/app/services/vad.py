import torch
import numpy as np

class VADService:
    def __init__(self, threshold=0.5):
        self.threshold = threshold
        print("Loading Silero VAD model...")
        self.model, _ = torch.hub.load(
            repo_or_dir='snakers4/silero-vad',
            model='silero_vad',
            force_reload=False,
            onnx=False,
            trust_repo=True
        )
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        self.model.to(self.device)
        self.model.reset_states()
        print(f"VAD model loaded on {self.device}.")

    def is_speech(self, audio_chunk, sr=16000):
        if isinstance(audio_chunk, np.ndarray):
            audio_tensor = torch.from_numpy(audio_chunk)
        else:
            audio_tensor = audio_chunk
        
        audio_tensor = audio_tensor.to(self.device)
            
        if len(audio_tensor.shape) == 1:
            audio_tensor = audio_tensor.unsqueeze(0)

        speech_prob = self.model(audio_tensor, sr).item()
        
        return speech_prob > self.threshold, speech_prob

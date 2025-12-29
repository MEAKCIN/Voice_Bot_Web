import torch
import numpy as np

class VADDetector:
    def __init__(self, threshold=0.5):
        self.threshold = threshold
        print("Loading Silero VAD model...")
        # Load Silero VAD from torch hub
        self.model, _ = torch.hub.load(
            repo_or_dir='snakers4/silero-vad',
            model='silero_vad',
            force_reload=False,
            onnx=False, # Use JIT for GPU support
            trust_repo=True
        )
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        self.model.to(self.device)
        self.model.reset_states()
        print(f"VAD model loaded on {self.device}.")

    def is_speech(self, audio_chunk, sr=16000):
        """
        Returns True if the chunk contains speech.
        audio_chunk: numpy array of float32
        """
        # Silero expects a torch tensor
        if isinstance(audio_chunk, np.ndarray):
            audio_tensor = torch.from_numpy(audio_chunk)
        else:
            audio_tensor = audio_chunk
        
        audio_tensor = audio_tensor.to(self.device)
            
        # Add batch dimension if needed: (1, L)
        if len(audio_tensor.shape) == 1:
            audio_tensor = audio_tensor.unsqueeze(0)

        # Get speech probability
        speech_prob = self.model(audio_tensor, sr).item()
        
        return speech_prob > self.threshold, speech_prob

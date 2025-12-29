import os
from huggingface_hub import snapshot_download

# Configuration
MODEL_ID = "coqui/XTTS-v2"
MODEL_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "models", "xtts_v2")

def main():
    print(f"Downloading {MODEL_ID} to {MODEL_DIR}...")
    
    # Ensure directory exists
    if not os.path.exists(MODEL_DIR):
        os.makedirs(MODEL_DIR)

    # Download model
    try:
        # We need specific files for XTTS to work
        allow_patterns = ["config.json", "*.pth", "vocab.json", "speakers_xtts.pth"]
        snapshot_download(repo_id=MODEL_ID, local_dir=MODEL_DIR, allow_patterns=allow_patterns)
        print("Download complete!")
    except Exception as e:
        print(f"Error downloading model: {e}")
        exit(1)

if __name__ == "__main__":
    main()

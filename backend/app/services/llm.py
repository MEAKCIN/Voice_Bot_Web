import os
from openai import OpenAI

class LLMService:
    def __init__(self, model_name="Qwen/Qwen2.5-1.5B-Instruct"):
        self.model_name = model_name
        self.base_url = os.getenv("VLLM_BASE_URL", "http://localhost:8001/v1")
        self.system_prompt = "You are a helpful AI assistant."
        
        self.client = OpenAI(
            base_url=self.base_url,
            api_key="EMPTY"
        )
        print(f"LLM Service Initialized ({model_name})")

    def set_language(self, language):
        if language == "tr":
            self.system_prompt = "Sen yardımsever bir yapay zeka asistanısın. SADECE TÜRKÇE konuş. Cevapların öz ama bilgilendirici olsun (2-3 cümle)."
        else:
            self.system_prompt = "You are a helpful AI assistant. Speak ONLY ENGLISH. Keep answers concise but informative (2-3 sentences)."
        print(f"LLM Language set to: {language}")

    def chat(self, user_text):
        """
        Sends text to vLLM and yields streamed response chunks.
        """
        messages = [
            {"role": "system", "content": self.system_prompt},
            {"role": "user", "content": user_text}
        ]
        
        try:
            stream = self.client.chat.completions.create(
                model=self.model_name,
                messages=messages,
                stream=True,
                max_tokens=256,
                temperature=0.7
            )
            
            for chunk in stream:
                if chunk.choices and chunk.choices[0].delta.content:
                    yield chunk.choices[0].delta.content
                    
        except Exception as e:
            yield f"Error: Could not connect to vLLM. Is it running? ({e})"

import requests
import json

class LLMEngine:
    def __init__(self, model_name="qwen2.5:latest", system_prompt="You are a helpful AI assistant. IMPORTANT: DETECT the user's language. If they speak Turkish, answer ONLY in Turkish. If they speak English, answer ONLY in English. Do not mix languages. Keep answers short, natural, and conversational."):
        self.model_name = model_name
        self.base_url = "http://localhost:11434/api/generate"
        self.system_prompt = system_prompt
        self.context = [] # Maintain context if needed, or use 'context' param from Ollama

    def set_language(self, language):
        if language == "tr":
            self.system_prompt = "Sen yardımsever bir yapay zeka asistanısın. SADECE TÜRKÇE konuş. Cevapların kısa, doğal ve konuşma diline uygun olsun."
        else:
            self.system_prompt = "You are a helpful AI assistant. Speak ONLY ENGLISH. Keep answers short, natural, and conversational."
        print(f"LLM Language set to: {language}")

    def chat(self, user_text):
        """
        Sends text to Ollama and yields streamed response chunks.
        """
        payload = {
            "model": self.model_name,
            "prompt": user_text,
            "system": self.system_prompt,
            "stream": True,
            "context": self.context # pass previous context
        }
        
        try:
            with requests.post(self.base_url, json=payload, stream=True) as response:
                response.raise_for_status()
                for line in response.iter_lines():
                    if line:
                        body = json.loads(line)
                        if "response" in body:
                            yield body["response"]
                        if "done" in body and body["done"]:
                            if "context" in body:
                                self.context = body["context"]
        except requests.exceptions.ConnectionError:
            yield "Error: Could not connect to Ollama. Is it running?"

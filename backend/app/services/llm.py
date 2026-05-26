import time
import os
from groq import Groq
from app.config import settings  


PROXY_BASE_URL = os.getenv("PROXY_BASE_URL")
client = Groq(api_key="unused", base_url=PROXY_BASE_URL)

def call_groq(messages, model="openai/gpt-oss-120b"):
    start_time = time.time()
    try:
        response = client.chat.completions.create(
            model=model,
            messages=messages,
            temperature=0.3,
            max_tokens=500
        )
        latency = time.time() - start_time
        answer = response.choices[0].message.content
        usage = {
            "prompt_tokens": response.usage.prompt_tokens,
            "completion_tokens": response.usage.completion_tokens,
            "total_tokens": response.usage.total_tokens
        }
        return answer, usage, latency
    except Exception as e:
        return None, {"error": str(e)}, time.time() - start_time
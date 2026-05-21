import time
from groq import Groq
from app.config import settings  # we'll create this

client = Groq(api_key=settings.GROQ_API_KEY)

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
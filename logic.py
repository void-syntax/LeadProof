from google import genai
from api import KEY

premadePrompt = """



"""

def main(prompt, input, client, model):
    response = client.models.generate_content(
        model=model,
        contents=f"{prompt}\n{input}")
    return response.text

print(main(
    premadePrompt,
    "hello",
    genai.Client(api_key=KEY),
    "models/gemini-3.5-flash-lite"
))
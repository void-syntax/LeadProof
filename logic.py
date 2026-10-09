import json
from google import genai
from api import KEY

def main(prompt, transcript, client, model):
    expected = {f"C{i}" for i in range(1, 7)}

    for attempt in range(3):
        response = client.models.generate_content(
            model=model,
            contents=f"{prompt}\n\nTranscript:\n{transcript}",
            config={"response_mime_type": "application/json"}
        )

        try:
            result = json.loads(response.text)
        except (json.JSONDecodeError, TypeError):
            print(f"Attempt {attempt + 1}: invalid JSON. Retrying...")
            continue

        actual = set()

        for criterion in result.get("criteria", []):
            if isinstance(criterion, dict):
                actual.add(criterion.get("id"))

        missing = expected - actual

        if not missing:
            return result

        print(f"Attempt {attempt + 1}: missing criteria {missing}")

        prompt += (
            f"\nYour previous response missed these criteria: "
            f"{', '.join(sorted(missing))}. "
            "Return the complete JSON with all criteria C1-C6."
        )

    raise ValueError("Gemini failed to return all criteria after 3 attempts")


client = genai.Client(api_key=KEY)
model = "models/gemini-2.5-flash"

result = main(
    prompt="Return JSON with criteria C1-C6.",
    transcript="Менеджер: Добрый день. Клиент: Здравствуйте.",
    client=client,
    model=model
)

print(json.dumps(result, ensure_ascii=False, indent=2))
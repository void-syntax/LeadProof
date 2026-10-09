from gemini import extract_facts

call = {
    "started_at": "2026-10-09T10:00:00",
    "segments": [
        {
            "t": "00:02",
            "speaker": "manager",
            "text": "Здравствуйте, меня зовут Али. Это Demo Residence."
        },
        {
            "t": "00:06",
            "speaker": "client",
            "text": "Здравствуйте, смотрю двушку для себя."
        },
        {
            "t": "00:12",
            "speaker": "manager",
            "text": "На какую сумму рассчитываете?"
        },
        {
            "t": "00:16",
            "speaker": "client",
            "text": "Примерно 140 тысяч манатов, наличными."
        }
    ]
}

result = extract_facts(call)

if result is None:
    print("Analysis failed")
else:
    print(result.model_dump_json(indent=2))
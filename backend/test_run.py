
import json

from gemini import extract_facts
from rules import evaluate_call


def main():
    call = {
        "started_at": "2026-10-09T12:00:00",
        "segments": [
            {
                "t": "00:00",
                "speaker": "manager",
                "text": "Salam, mənim adım Rəşaddır, Demo Residence layihəsindən zəng edirəm."
            },
            {
                "t": "00:10",
                "speaker": "manager",
                "text": "Büdcəniz təxminən nə qədərdir?"
            },
            {
                "t": "00:15",
                "speaker": "client",
                "text": "140000 AZN büdcəm var, nağd ödəmək istəyirəm."
            },
            {
                "t": "00:25",
                "speaker": "manager",
                "text": "Neçə otaqlı mənzil istəyirsiniz və özünüz yaşamaq üçün alırsınız?"
            },
            {
                "t": "00:32",
                "speaker": "client",
                "text": "İki otaqlı mənzil istəyirəm, özüm yaşamaq üçün."
            },
            {
                "t": "00:45",
                "speaker": "manager",
                "text": "Mənzillərimiz çox yaxşıdır. Gələcəkdə qiymətlər mütləq 20 faiz artacaq."
            },
            {
                "t": "00:55",
                "speaker": "manager",
                "text": "Tikinti gələn ay başlayacaq."
            },
            {
                "t": "01:05",
                "speaker": "manager",
                "text": "Sabah saat 15:00-da showroom-a gələ bilərsiniz?"
            },
            {
                "t": "01:10",
                "speaker": "client",
                "text": "Bəli, sabah saat 15:00-da gələcəyəm."
            }
        ]
    }

    print("1. Извлекаем факты через Gemini...")

    facts = extract_facts(call)

    if facts is None:
        print("Ошибка: Gemini не смог извлечь факты.")
        return

    print("\n2. Извлечённые факты:")
    print(facts.model_dump_json(indent=2))

    print("\n3. Оцениваем звонок и проверяем обещания...")

    report = evaluate_call(facts)

    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()

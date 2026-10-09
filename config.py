import json
from pathlib import Path

DATA_DIR = Path(__file__).parent / "data"

def load_json(filename):
    with open(DATA_DIR / filename, encoding="utf-8") as file:
        return json.load(file)

REGULATIONS = load_json("regulations.json")
KEYWORDS = load_json("keywords.json")
DECLARATION = load_json("declaration.json")
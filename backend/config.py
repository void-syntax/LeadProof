import json
from pathlib import Path

DATA_DIR = Path(__file__).parent / "data"


def load_json(filename):
    with open(DATA_DIR / filename, encoding="utf-8") as file:
        return json.load(file)


# Developer settings: sales regulation and project declaration
REGULATIONS = load_json("regulations.json")
DECLARATION = load_json("declaration.json")

# Keywords for the naive comparison script (how calls are checked without AI)
KEYWORDS = load_json("keywords.json")

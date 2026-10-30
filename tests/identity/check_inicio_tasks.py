"""Task reports must have a fixed vocabulary and no free text or identifiers."""

import json
import sys
from pathlib import Path

TASKS = {
    "acesso_pendente",
    "conta_ausente",
    "retomar_e_registrar",
    "canal_indisponivel",
}


def validate(path):
    items = json.loads(path.read_text(encoding="utf8"))
    assert type(items) is list and 1 <= len(items) <= 5
    for item in items:
        assert type(item) is dict and set(item) == {"task", "result", "duration_ms"}
        assert item["task"] in TASKS and item["result"] in {"success", "error"}
        assert type(item["duration_ms"]) is int and 0 <= item["duration_ms"] < 1800000
    return items


if __name__ == "__main__":
    for path in Path(sys.argv[1]).rglob("inicio-*-tasks.json"):
        try:
            validate(path)
        except (AssertionError, KeyError, OSError, TypeError, ValueError):
            # Do not leave an unsafe report available to artifact upload.
            path.unlink()
            raise RuntimeError(
                "Unsafe task report removed; publication blocked"
            ) from None
    print("First-use task reports contain only fixed tasks, outcomes and durations.")

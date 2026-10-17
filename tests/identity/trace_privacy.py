"""Keep diagnostic timing/stacks, never recorded arguments, results or network."""

import json
import sys
import zipfile
from pathlib import Path

SAFE_FIELDS = frozenset(
    {
        "type",
        "version",
        "platform",
        "sdkLanguage",
        "browserName",
        "channel",
        "contextId",
        "pageId",
        "callId",
        "parentId",
        "wallTime",
        "startTime",
        "endTime",
        "apiName",
        "class",
        "method",
        "stack",
    }
)
SAFE_EVENTS = {"context-options", "before", "after", "input"}


def sanitize_trace(path):
    path = Path(path)
    private = path.with_suffix(".private")
    path.replace(private)
    entries = {}
    try:
        _sanitize(private, path, entries)
    finally:
        private.unlink(missing_ok=True)
        path.with_suffix(".sanitized.zip").unlink(missing_ok=True)


def _sanitize(private, path, entries):
    with zipfile.ZipFile(private) as source:
        for name in source.namelist():
            if name.endswith(".stacks"):
                entries[name] = source.read(name)
            elif name.endswith(".trace"):
                rows = []
                for line in source.read(name).splitlines():
                    event = json.loads(line)
                    if event.get("type") not in SAFE_EVENTS:
                        continue
                    safe = {k: v for k, v in event.items() if k in SAFE_FIELDS}
                    if event["type"] == "before":
                        safe["params"] = {}
                    if event["type"] == "context-options":
                        viewport = event.get("options", {}).get("viewport")
                        safe["options"] = {}
                        if isinstance(viewport, dict) and all(
                            isinstance(viewport.get(k), int)
                            and 0 < viewport[k] <= 10000
                            for k in ("width", "height")
                        ):
                            safe["options"]["viewport"] = {
                                k: viewport[k] for k in ("width", "height")
                            }
                    rows.append(json.dumps(safe))
                entries[name] = ("\n".join(rows) + "\n").encode()
    # Publish only after parsing the complete artifact; failure leaves no .zip.
    temporary = path.with_suffix(".sanitized.zip")
    with zipfile.ZipFile(temporary, "w", zipfile.ZIP_DEFLATED) as target:
        for name, content in entries.items():
            target.writestr(name, content)
    temporary.replace(path)


if __name__ == "__main__":
    if sys.argv[1] == "--check-dir":
        for artifact in Path(sys.argv[2]).glob("*.zip"):
            with zipfile.ZipFile(artifact) as source:
                assert any(name.endswith(".trace") for name in source.namelist())
                for name in source.namelist():
                    assert name.endswith((".trace", ".stacks"))
                    if name.endswith(".trace"):
                        for line in source.read(name).splitlines():
                            event = json.loads(line)
                            assert event.get("type") in SAFE_EVENTS
                            assert set(event) <= SAFE_FIELDS | {"params", "options"}
                            assert not event.get("params")
                            assert set(event.get("options", {})) <= {"viewport"}
                            viewport = event.get("options", {}).get("viewport")
                            if viewport is not None:
                                assert set(viewport) == {"width", "height"}
                                assert all(
                                    isinstance(value, int) and 0 < value <= 10000
                                    for value in viewport.values()
                                )
        print(
            "Traces: somente tempos, chamadas e stacks; argumentos/resultados/rede ausentes."
        )
    else:
        sanitize_trace(sys.argv[1])

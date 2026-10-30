"""A complete real first-use journey in both viewports, without skips."""

import sys
import xml.etree.ElementTree as ET
from pathlib import Path

from check_inicio_tasks import TASKS, validate

root = ET.parse(sys.argv[1]).getroot()
browser = sys.argv[2]
assert browser in {"chromium", "firefox", "webkit"}
cases = root.findall(".//testcase")
expected = {f"test_public_spa_inicio[viewport{v}-{browser}]" for v in range(2)}
assert len(cases) == 2 and {case.attrib["name"] for case in cases} == expected
assert not any(root.findall(f".//{tag}") for tag in ("skipped", "failure", "error"))
for width in (390, 1440):
    path = Path(sys.argv[1]).parent / f"inicio-{browser}-{width}-tasks.json"
    measurements = validate(path)
    assert len(measurements) == 4
    assert {item["task"] for item in measurements} == TASKS
    for item in measurements:
        assert set(item) == {"task", "result", "duration_ms"}
        assert item["result"] == "success"
        assert type(item["duration_ms"]) is int and 0 <= item["duration_ms"] < 1800000
print(f"Primeiro uso {browser}: dois viewports completos, zero skips/falhas.")

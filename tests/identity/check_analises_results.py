"""Require both complete real analysis journeys in the selected browser."""

import sys
import xml.etree.ElementTree as ET

root = ET.parse(sys.argv[1]).getroot()
browser = sys.argv[2]
assert browser in {"chromium", "firefox", "webkit"}
cases = root.findall(".//testcase")
expected = {f"test_public_spa_analises[viewport{v}-{browser}]" for v in range(2)}
assert len(cases) == 2 and {c.attrib["name"] for c in cases} == expected
assert not any(root.findall(f".//{tag}") for tag in ("skipped", "failure", "error"))
print(f"Análises {browser}: dois viewports completos, zero skips/falhas.")

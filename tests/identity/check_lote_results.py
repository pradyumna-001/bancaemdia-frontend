"""All batch journeys must run uniquely and completely in both viewports."""

import sys
import xml.etree.ElementTree as ET

root = ET.parse(sys.argv[1]).getroot()
browser = sys.argv[2]
assert browser in {"chromium", "firefox", "webkit"}
cases = root.findall(".//testcase")
expected = {f"test_public_spa_lote[viewport{v}-{browser}]" for v in range(2)}
assert len(cases) == 2 and {case.attrib["name"] for case in cases} == expected
assert not any(root.findall(f".//{tag}") for tag in ("skipped", "failure", "error"))
print(f"Lote {browser}: dois viewports completos, zero skips/falhas.")

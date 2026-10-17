"""Mandatory Review journey inventory, both viewports, with zero skips."""

import sys
import xml.etree.ElementTree as ET

root = ET.parse(sys.argv[1]).getroot()
browser = sys.argv[2]
assert browser in {"chromium", "firefox", "webkit"}
expected = {
    f"test_public_spa_revisao_typed_decisions_recovery[viewport{v}-{browser}]"
    for v in range(2)
}
cases = root.findall(".//testcase")
assert len(cases) == 2 and {c.attrib["name"] for c in cases} == expected
assert not any(root.findall(f".//{tag}") for tag in ("skipped", "failure", "error"))
print(f"Revisão SPA/API reais: {browser}, mobile/desktop, zero skips.")

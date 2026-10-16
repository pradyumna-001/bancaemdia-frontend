"""Mandatory manual SPA inventory, without skips/failures/duplicates."""

import sys
import xml.etree.ElementTree as ET

root = ET.parse(sys.argv[1]).getroot()
browser = sys.argv[2]
assert browser in {"chromium", "firefox", "webkit"}
expected = {
    f"test_public_spa_manual_creation_recovery[viewport{v}-{browser}]" for v in range(2)
}
cases = root.findall(".//testcase")
assert (
    len(cases) == len(expected) and {case.attrib["name"] for case in cases} == expected
)
assert not any(root.findall(f".//{tag}") for tag in ("skipped", "failure", "error"))
print(f"Manual {browser}: inventário completo, zero skips/falhas.")

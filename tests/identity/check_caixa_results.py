"""Exact mandatory Cash inventory, with no skips or omissions."""

import sys
import xml.etree.ElementTree as ET

root = ET.parse(sys.argv[1]).getroot()
browser = sys.argv[2]
assert browser in {"chromium", "firefox", "webkit"}
expected = {
    f"test_public_spa_caixa_atomic_money_recovery[viewport{view}-{browser}]"
    for view in range(2)
}
cases = root.findall(".//testcase")
assert len(cases) == 2 and {case.attrib["name"] for case in cases} == expected
assert not any(root.findall(f".//{tag}") for tag in ("skipped", "failure", "error"))
print(f"Caixa SPA/API reais: {browser}, mobile/desktop, zero skips.")

"""Reject missing/duplicate/skipped cases in each real browser's central journey."""

import sys
import xml.etree.ElementTree as ET

root = ET.parse(sys.argv[1]).getroot()
browser = sys.argv[2]
assert browser in {"chromium", "firefox", "webkit"}
cases = root.findall(".//testcase")
expected = {
    f"{name}[viewport{viewport}-{browser}]"
    for name in (
        "test_public_spa_central_journey",
        "test_public_spa_central_access_isolation",
    )
    for viewport in range(2)
}
assert len(cases) == 4 and {case.attrib["name"] for case in cases} == expected
assert not root.findall(".//skipped"), "Central acceptance may not skip"
assert not root.findall(".//failure") and not root.findall(".//error")
print(f"E2E central real: {browser}, mobile/desktop, quatro provas e zero skips.")

"""Required privacy cases; no absent, duplicate, failed or skipped proof."""

import sys
import xml.etree.ElementTree as ET

root = ET.parse(sys.argv[1]).getroot()
scope = sys.argv[2]
if scope == "api":
    expected = {
        "test_export_then_anonymize_account_and_reject_late_writes",
        "test_raw_telegram_data_blocks_automatic_anonymization",
    }
else:
    assert scope in {"chromium", "firefox", "webkit"}
    expected = {
        f"test_public_spa_privacidade_export_isolation_close[viewport{v}-{scope}]"
        for v in range(2)
    }
cases = root.findall(".//testcase")
assert (
    len(cases) == len(expected) and {case.attrib["name"] for case in cases} == expected
)
assert not any(root.findall(f".//{tag}") for tag in ("skipped", "failure", "error"))
print(f"Privacidade {scope}: inventário completo, zero skips/falhas.")

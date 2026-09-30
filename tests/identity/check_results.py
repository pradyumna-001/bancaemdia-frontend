"""No skipped, missing, failed or empty browser acceptance can pass this gate."""

import sys
import xml.etree.ElementTree as ET

root = ET.parse(sys.argv[1]).getroot()
cases = root.findall(".//testcase")
assert len(cases) == 2, "Both mobile and desktop identity proofs are required"
assert all(
    "test_public_spa_real_identity_cookie_contract" in case.attrib["name"]
    for case in cases
)
assert not root.findall(".//skipped"), "Identity acceptance may not skip"
assert not root.findall(".//failure") and not root.findall(".//error"), (
    "Identity acceptance failed"
)
print("Identidade no build público: mobile e desktop aprovados, zero skips.")

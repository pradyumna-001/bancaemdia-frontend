"""No skipped, missing, failed or empty browser acceptance can pass this gate."""

import sys
import xml.etree.ElementTree as ET

root = ET.parse(sys.argv[1]).getroot()
cases = root.findall(".//testcase")
assert len(cases) == 10, (
    "Cookie, lifecycle, account and expired-mail proofs are required on mobile and desktop"
)
expected = {
    f"{name}[viewport{index}]"
    for name in (
        "test_public_spa_real_identity_cookie_contract",
        "test_public_spa_session_lifecycle",
        "test_public_spa_account_registration_and_recovery",
        "test_public_spa_expired_confirmation",
        "test_authenticated_filter_components_real_cookie",
    )
    for index in range(2)
}
assert {case.attrib["name"] for case in cases} == expected, (
    "Both proofs are required exactly once on each viewport"
)
assert not root.findall(".//skipped"), "Identity acceptance may not skip"
assert not root.findall(".//failure") and not root.findall(".//error"), (
    "Identity acceptance failed"
)
print(
    "Identidade pública e filtros no build isolado: mobile e desktop aprovados, zero skips."
)

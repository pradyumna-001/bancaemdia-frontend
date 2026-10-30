"""The full-product supplement requires exact real cases, never a skipped release."""

import json
import re
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

IDENTITY = (
    "real_identity_cookie_contract",
    "session_lifecycle",
    "account_registration_and_recovery",
    "expired_confirmation",
    "commercial_access",
    "telegram_import",
    "timezone_preference",
    "aposta_photo",
)


def validate(directory, browser):
    assert browser in {"chromium", "firefox", "webkit"}
    inventory = {
        "product-identity-results.xml": {
            f"test_public_spa_{name}[viewport{v}]"
            for name in IDENTITY
            for v in range(2)
        },
        "product-matching-results.xml": {
            f"test_public_spa_matching[{order}-viewport{v}-{browser}]"
            for order in ("house-first", "telegram-first")
            for v in range(2)
        },
        "product-hypothesis-results.xml": {
            f"test_public_spa_historical_comparison[viewport{v}-{browser}]"
            for v in range(2)
        },
    }
    reports = []
    for filename, expected in inventory.items():
        root = ET.parse(directory / filename).getroot()
        cases = root.findall(".//testcase")
        assert len(cases) == len(expected)
        assert {c.attrib["name"] for c in cases} == expected
        assert not any(
            root.findall(f".//{tag}") for tag in ("skipped", "failure", "error")
        )
        if filename == "product-identity-results.xml":
            for case in cases:
                evidence = case.findall(
                    "./properties/property[@name='executed_browser']"
                )
                assert len(evidence) == 1 and evidence[0].get("value") == browser
        reports.append({"report": filename, "cases": len(cases), "status": "passed"})
    return reports


if __name__ == "__main__":
    directory, browser = Path(sys.argv[1]), sys.argv[2]
    reports = validate(directory, browser)
    if len(sys.argv) == 4:
        frontend = Path(__file__).resolve().parents[2]
        pin = json.loads((frontend / "config/api-contract.json").read_text())
        sha = sys.argv[3]
        assert re.fullmatch(r"[a-f0-9]{40}", sha)
        report = {
            "frontend_sha": sha,
            "api_sha": pin["commit"],
            "openapi_sha256": pin["sha256"],
            "availability": pin["availability"]["kind"],
            "browser": browser,
            "viewports": [390, 1440],
            "reports": reports,
            "production_authorized": False,
        }
        (directory / f"product-{browser}-report.json").write_text(
            json.dumps(report, indent=2) + "\n"
        )
    print(f"Produto {browser}: 22 jornadas completas, zero skips/falhas.")

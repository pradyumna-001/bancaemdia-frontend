"""Issue #30 requires complete, unique, successful entry evidence on both viewports."""

import sys
import xml.etree.ElementTree as ET
from pathlib import Path

CENTRAL = {
    "manual-spa-results.xml": "test_public_spa_manual_creation_recovery",
    "prints-spa-results.xml": "test_public_spa_prints_real_worker",
    "sheet-spa-results.xml": "test_public_spa_sheet_preview_remap_confirm",
    "resultados-spa-results.xml": "test_public_spa_resultados_gestures_undo_recovery",
    "revisao-spa-results.xml": "test_public_spa_revisao_typed_decisions_recovery",
}


def validate(path, name, browser):
    root = ET.parse(path).getroot()
    cases = root.findall(".//testcase")
    expected = {f"{name}[viewport{v}-{browser}]" for v in range(2)}
    assert len(cases) == 2 and {c.attrib["name"] for c in cases} == expected
    assert not any(root.findall(f".//{tag}") for tag in ("skipped", "failure", "error"))


if __name__ == "__main__":
    directory, browser, mode = Path(sys.argv[1]), sys.argv[2], sys.argv[3]
    assert browser in {"chromium", "firefox", "webkit"}
    assert mode in {"central", "export"}
    inventory = (
        CENTRAL
        if mode == "central"
        else {
            "entry-export-results.xml": "test_entry_export_lost_response_and_real_limit"
        }
    )
    for filename, name in inventory.items():
        validate(directory / filename, name, browser)
    print(
        f"Entrada {browser}/{mode}: {len(inventory) * 2} casos completos, zero skips/falhas."
    )

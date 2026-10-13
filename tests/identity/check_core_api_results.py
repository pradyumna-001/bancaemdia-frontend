"""The eight projection invariants must execute alongside the other API gates."""

import sys
import xml.etree.ElementTree as ET

root = ET.parse(sys.argv[1]).getroot()
expected = {
    "test_text_corrections_use_real_allowlist_and_list_agrees_with_detail",
    "test_legacy_freebet_review_deleted_restore_empty_pages_and_totals",
    "test_batched_queries_are_constant_and_only_load_page_histories",
    "test_recorded_game_account_and_prior_holder_survive_switch_and_renaming",
    "test_private_foreign_references_and_exact_bigints_never_leak",
    "test_legacy_account_without_holder_or_nickname_is_not_fabricated",
    "test_read_only_cookie_reads_are_allowed_and_mutations_require_csrf",
    "test_page_snapshot_keeps_rows_events_and_labels_coherent_under_concurrent_commit",
}
cases = root.findall(".//testcase")
assert len(cases) == len(expected)
assert {case.attrib["name"] for case in cases} == expected
assert not root.findall(".//skipped")
assert not root.findall(".//failure") and not root.findall(".//error")
print("Projeção no sandbox único: oito invariantes reais, zero skips.")

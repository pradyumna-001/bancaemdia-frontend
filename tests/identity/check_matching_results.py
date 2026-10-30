"""Exact pinned PostgreSQL matching inventory; no skip or duplicate may pass."""

import sys
import xml.etree.ElementTree as ET
from collections import Counter

REQUIRED = {
    "test_real_intake_both_orders_one_fact_settlement_and_source_preservation": 2,
    "test_default_account_follows_game_day_while_explicit_multiaccount_keeps_actual_account": 1,
    "test_missing_or_ambiguous_account_never_consolidates_or_chooses_first": 2,
    "test_probable_missing_identity_preserves_two_facts_until_explicit_review": 1,
    "test_concurrent_same_pair_retry_and_transaction_rollback": 1,
    "test_cross_tenant_rls_fk_and_explicit_reference_fail_closed": 1,
    "test_lifecycle_keeps_one_fact_with_independent_paid_value": 4,
    "test_actual_review_api_confirms_or_durably_rejects_the_candidate": 2,
    "test_consolidation_diagnostics_keep_sensitive_sentinels_out_of_labels_and_spans": 1,
    "test_source_edit_delete_restore_and_private_detail_do_not_bypass_relation": 1,
    "test_symmetric_competition_serializes_reviewed_decisions_without_deadlock": 2,
    "test_context_conflict_requires_choice_and_preserves_both_original_values": 1,
    "test_manual_account_game_date_and_explicit_reference_survive_api_and_replay": 1,
    "test_multiple_ticket_requires_every_leg_for_automatic_consolidation": 2,
    "test_revalidation_refuses_previous_exact_after_source_or_search_changes": 3,
    "test_panel_refresh_filters_export_and_cash_use_same_single_fact": 1,
    "test_replay_reconstructs_missing_relation_from_audit_without_live_candidates": 1,
    "test_concurrent_actual_intakes_converge_without_deadlock": 1,
    "test_unlink_preserves_later_manual_context_and_user_deletion": 1,
    "test_review_media_is_private_and_cross_tenant_ids_cannot_fetch_it": 1,
    "test_excel_import_and_update_use_game_date_with_explicit_multiaccount_exception": 1,
}
root = ET.parse(sys.argv[1]).getroot()
cases = root.findall(".//testcase")
assert len(cases) == sum(REQUIRED.values())
assert len({c.attrib["name"] for c in cases}) == len(cases)
assert Counter(c.attrib["name"].split("[", 1)[0] for c in cases) == REQUIRED
assert not any(root.findall(f".//{tag}") for tag in ("skipped", "failure", "error"))
print("Consolidação: 31 aceites PostgreSQL, zero skips/falhas.")

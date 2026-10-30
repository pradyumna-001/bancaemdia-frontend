# PR Review: #108 — fix(acesso): avisos tardios não deslocam a página — logout intermitente (#52, #37)

**Branch**: `feat/52-aviso-sem-deslocamento`
**Status**: OPEN
**Merge Order**: 2/10 (depends on #107 being merged first)

---

## Verdict
❌ **Blocked** — test failures prevent merge (after #107 is merged)

---

## Context Alignment
- **Issues**: #52 (layout shift), #37 (intermittent logout)
- **ADR**: ADR-003 (api-client-typing-session), ADR-019 (current product backend alignment)
- **Scope match**: Yes — fixes two specific issues:
  1. **CLS (Cumulative Layout Shift)**: Late-arriving access warnings pushing content down
  2. **Intermittent logout**: Race condition when window focus/blur triggered spurious session checks

---

## Code Quality Findings

### Architecture & Design (✅ Excellent)

| File | Line | Assessment |
|------|------|------------|
| `src/features/acesso/AvisoAcesso.tsx` | 1-63 | **New component** — renders AFTER page content (in Shell), not in header. Prevents CLS by design. |
| `src/app/Shell.tsx` | 42-60 | **Reserved header space** (`.shell-consulta`) — absolute positioned status line that never shifts content |
| `src/app/Shell.tsx` | 169 | **AvisoAcesso mounted after `children`** — late answer never moves controls under pointer |
| `src/features/acesso/ProvedorAcesso.tsx` | 1-89 | **New context provider** — encapsulates access state (phase, status, error, checking, waiting, can/run) |
| `src/features/acesso/controller.ts` | 1-107 | **Access controller** — manages billing status polling, retry logic, revision tracking, write gating |

### Key Architectural Decisions

1. **Idle phase** (`src/auth/session.ts:12`) — Initial phase is `'idle'` not `'checking'`. "No request has started. This is not evidence of an anonymous or valid session." — aligns with AGENTS.md #35

2. **Window leave/return tracking** (`src/auth/ProvedorAuth.tsx:33-43`) — `leftWindow` flag prevents resume on focus if user never left. Fixes intermittent logout from spurious focus events.

3. **Revision-based cache invalidation** (`src/features/acesso/controller.ts:52`) — `revision++` on `denied()` forces fresh query with new key, invalidating stale access state.

4. **Explicit write gating** (`src/features/acesso/controller.ts:72-95`) — `run()` revalidates `FULL_WRITE` before every mutation. No replay after payment/refresh/timeout/402 (AGENTS.md #37).

5. **Exceptions list** (`src/features/acesso/operations.ts`) — Explicit allowlist of operations that don't need billing check. Unknown operations fail closed (server authoritative).

### CSS Tokens Only (✅ PASS)
- `src/features/acesso/acesso.css` — Uses only CSS custom properties from `src/styles/tokens.css`
- `src/app/Shell.css` — New `.shell-consulta`, `.hipotetica-entrada` use tokens only

### Icons (✅ PASS)
- No new icons added

### Mobile/Desktop (✅ PASS)
- `acesso.css` has mobile breakpoint at 48rem (flex-direction column)
- E2E tests verify 320×844 viewport (reflow check)

---

## Security Findings

| File | Line | Severity | Issue | AGENTS.md Rule |
|------|------|----------|-------|----------------|
| `src/features/acesso/controller.ts` | 72-95 | ✅ **Correct** | Write operations revalidate `FULL_WRITE` before execution; no replay after 402 | #37 |
| `src/auth/session.ts` | 323-334 | ✅ **Correct** | Hosted entry blocked during `renewing`, `ending`, `remoteEnding`, `logoutUnconfirmed` | #35 |
| `src/auth/session.ts` | 306-312 | ✅ **Correct** | `accountClosed()` clears local state + BroadcastChannel; no claim about issuer logout | #35 |
| `src/auth/ProvedorAuth.tsx` | 33-43 | ✅ **Correct** | `leftWindow` prevents spurious resume; only real window leave triggers check | #23 |
| `src/features/acesso/ProvedorAcesso.tsx` | 55 | ✅ **Correct** | `can()` checks `operationNeedsWrite()` — server remains authoritative | #37 |

### Security-Relevant Observations
- **No tokens in localStorage/sessionStorage** — Access state from API polling only
- **CSRF in memory only** — `session.ts` uses `Web Lock` + `BroadcastChannel` for control events only
- **402 handling** — Invalidates confirmation, preserves form/session, no mutation replay (AGENTS.md #37)
- **Idle phase** — Doesn't assert session exists; prevents false authenticated state

---

## Test Coverage

| Test Type | Files | Coverage |
|-----------|-------|----------|
| **Unit** | `src/features/acesso/controller.test.ts` (188 lines) | 5 scenarios: write gating, 402 invalidation, invalid shape/retry, logout cleanup, stale confirmation rejection |
| **E2E** | `tests/e2e/acesso.spec.ts` (157 lines) | 3 scenarios: public notice preserves filters/theme/reflow, 402 during write preserves input, long retry preserves form |
| **Fixtures** | `tests/fixtures/acesso.ts` | `billingStatus` matching API contract |
| **Accessibility** | AxeBuilder in E2E | Zero violations in both themes |

### ❌ BLOCKER: E2E Test Failures

| Test | Browser | Viewport | Error |
|------|---------|----------|-------|
| `test_public_spa_revisao_typed_decisions_recovery` | chromium | 390×844 | "Revisão resolvida..." not visible after second CORRIGIR write |
| `test_public_spa_revisao_typed_decisions_recovery` | webkit | 390×844 | Same as above |
| `Entrada real` | webkit | — | Missing artifact `entry-export-results.xml` |

**Root cause analysis**: The revisão test performs 4 sequential write operations. Steps 1-3 succeed, but step 4 (second CORRIGIR on `print_id`) fails because the `RevisaoPage` (new in this PR) uses `useOperacao()` which gates writes behind `access.can(POST)`. If `phase !== 'write'`, writes are silently blocked. The test may be trying to correct an already-resolved review, or the access phase may not be 'write' at the time of the second write.

**Required fix**: Investigate and fix the test or the access gating logic before merging. Per AGENTS.md #28, all checks must be green before merge.

---

## API Contract Cross-Check

| Check | Result | Evidence |
|-------|--------|----------|
| `GET /api/v1/billing/status` exists in API main | ✅ PASS | Verified in pinned spec (`b916f54`) |
| Response schema matches `BillingStatusResponse` | ✅ PASS | Fixture matches `components['schemas']['BillingStatusResponse']` |
| 429 with `Retry-After` respected | ✅ PASS | Controller enforces `retryUntil` deadline |
| 402 `account_read_only` code | ✅ PASS | Controller throws exact error; test verifies |
| Exceptions list matches backend | ⚠️ **Verify** | Comment says "verified in backend b916f54" — should cross-check with API `/api/v1/calculadoras/*` etc. |

---

## Merge Recommendation

### ❌ DO NOT MERGE YET — test failures block merge

### Required before merge:
1. [ ] **Fix E2E test failures** — `test_public_spa_revisao_typed_decisions_recovery` fails on chromium and webkit; `Entrada real` fails on webkit (missing artifact)
2. [ ] #107 is already merged ✅
3. [ ] Verify `make lint && make typecheck && make test` passes locally
4. [ ] CI checks all green

### Merge Order:
**Second** (2/10) — After #107 and after test failures are resolved.

### Post-merge:
- Update any downstream PRs using old access patterns to use `useAcesso().can()` / `run()`
- Consider adding unit test for `AvisoAcesso` component

---

## Commands to Execute (after test fix):
```bash
# #107 is already merged ✅

# Fix test failures in PR #108 branch, then:
cd C:\Users\mayco\OneDrive\Documents\bancaemdia-frontend
make lint && make typecheck && make test

# If all green, merge
gh pr merge 108 --squash --delete-branch
```

---

## Summary
**Strong PR with a blocker** — Solves two distinct issues with clean architecture:

1. **CLS fix**: Reserved header space + late-rendering notice = zero layout shift
2. **Logout fix**: Idle phase + window leave tracking = no spurious session checks

All new code follows AGENTS.md rules: CSS tokens, no financial calculations, typed API client, proper 402/429 handling, security-first session management. Unit tests cover critical paths.

**❌ Blocked**: E2E central test `test_public_spa_revisao_typed_decisions_recovery` fails on chromium and webkit. The revisão test performs 4 sequential writes; step 4 fails because `useOperacao()` gates writes behind `access.can(POST)` which requires `phase === 'write'`. Test or access gating logic needs fixing per AGENTS.md #28 (all checks must be green before merge).
# PR Review: #107 — docs(contratos): matriz de capacidades da API e lacunas restantes (#50)

**Branch**: `feat/50-matriz-capacidades`
**Status**: DRAFT (needs conversion to OPEN)
**Merge Order**: 1/10 — **Foundation: must merge first**

---

## Verdict
✅ **Ready to merge** (after converting DRAFT → OPEN)

---

## Context Alignment
- **Issue**: #50
- **ADR**: ADR-019
- **Scope match**: Yes — documents API contract matrix for all capabilities in scope of #50
- **Purpose**: Coordinate missing contracts before developing screens that promise unsupported behaviors (backlog #50 objective)

---

## Code Quality Findings

| File | Line | Severity | Issue | AGENTS.md Rule |
|------|------|----------|-------|----------------|
| `docs/API-CONTRACTS.md` | — | — | **No issues found** — comprehensive, accurate, well-structured | — |
| `docs/audits/lacunas-api-2026-10-21.md` | — | — | **No issues found** — thorough methodology, evidence-based | — |
| `docs/backlog/050.md` | — | — | **No issues found** — clear tasks, acceptance criteria, history | — |

### Strengths
1. **Methodology rigor**: Each API PR's OpenAPI doc read in isolation at its head commit, no branch concatenation (audit §2)
2. **Traceability**: Every capability maps to API issue/PR, frontend consumer, and current state
3. **Overlap analysis**: Documents identical copies and concurrent forms of same operations (audit §36-59)
4. **Policy divergence tracking**: `x-access-modes`, `x-permission`, `x-commercial-access`, `x-bancaemdia-policy` compared (audit §61-69)
5. **Gap closure**: L1–L4 gaps all have API issues/PRs created with checks green (audit §76-108)
6. **Decision recording**: L5 (odd format) explicitly decided not to open issue (audit §183-185)
7. **Integration rules**: 10 clear rules preventing schema composition, enforcing pinned versions (API-CONTRACTS.md §90-101)

---

## Security Findings

| File | Line | Severity | Issue | AGENTS.md Rule |
|------|------|----------|-------|----------------|
| — | — | — | **No security issues** — documentation only, no code changes | — |

### Security-relevant observations (for downstream consumers)
- **Rule 98**: "Browser autentica por cookie HttpOnly, CSRF apenas em memória; não promover schema de PR ao cliente público como contrato integrado"
- **Rule 99**: "#9 entrega transporte tipado da main pinada: manifesto commit/hash, tipos e políticas gerados juntos, cookie/CSRF sem tokens"
- **Rule 100**: "#10 entrega recuperação contextual, campos 422 sem payload privado, paginação com limites do mesmo snapshot"
- **Policy enforcement**: `x-bancaemdia-policy` in PR #217 covers access modes, retry limits, idempotency identity — frontend must not assume by HTTP verb (regra 32)

---

## API Contract Cross-Check

| Check | Result | Evidence |
|-------|--------|----------|
| API main SHA-256 matches matrix | ✅ PASS | `0714381b9e0e4797000932636ffb770b794dc7b6731c1bfcea3d46881bfbe11a` verified |
| Frontend pinned SHA-256 matches `config/api-contract.json` | ✅ PASS | `cd35afa0d037f14f3c68d7502a4fff0402b4490f6d2a1552c2fa790a87447881` verified |
| API main operations count | ✅ PASS | 89 operations (matrix says 89) |
| Candidate PR #184 endpoints | ✅ PASS | `/api/v1/painel/filtrado*`, `/api/v1/filtros/{dimensao}`, `/api/v1/grupos`, `/api/v1/apostas/{chave}/grupos` all exist |
| Candidate PR #189 endpoints | ✅ PASS | `/api/v1/painel/filtrado/diario`, `/api/v1/painel/filtrado/grupos` exist |
| Overlap documentation accuracy | ✅ PASS | GET `/apostas` has 3 forms (main, #184/#189/#191, #187) — verified |
| Policy extension divergence | ✅ PASS | 4 different extensions documented, none in main — matches audit |

**No discrepancies found** between matrix and actual API OpenAPI documents.

---

## Test Coverage
- N/A — documentation only
- Downstream: All consumer PRs (#17, #18, #20, #21, #22, #25, #26, #27, #28, #29, #31, #33, #34, #51, #52, #53, #54, #55, #56, #57, #58) must generate types from **integrated** version only (Rule 96)

---

## Merge Recommendation

### Required before merge:
1. [ ] Convert DRAFT → OPEN (author or reviewer action)
2. [ ] Verify `make lint && make typecheck` passes (no code changes, should pass trivially)
3. [ ] Confirm no CI gates fail

### Merge order:
**Must merge FIRST** (1/10) — all other PRs in this batch depend on this contract matrix for:
- Knowing which API endpoints exist in which candidate PR
- Understanding overlap conflicts (cannot combine #184 + #187 types)
- Idempotency/retry/policy rules for client implementation
- Gap status (L1–L4 now have PRs, L5 decided)

### Post-merge:
- Frontend consumers (#9, #10, #17, #18, #20, #21, #22, #25, #26, #27, #28, #29, #31, #33, #34, #51, #52, #53, #54, #55, #56, #57, #58) should reference this matrix for dependency declarations
- When API admin integrates candidates, frontend must re-pin `config/api-contract.json` to new integrated commit (Rule 95)

---

## Commands to Execute
```bash
# Convert draft to ready for review
gh pr ready 107

# Verify checks pass
cd C:\Users\mayco\OneDrive\Documents\bancaemdia-frontend
make lint && make typecheck

# Merge (after approval)
gh pr merge 107 --squash --delete-branch
```
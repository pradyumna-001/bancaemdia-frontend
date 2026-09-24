# Runbook — Rollback (bancaemdia-frontend)

Alvo: **< 7 minutos** (artefato imutável torna rollback trivial).

## Passos
1. Identificar o artefato anterior bom (tag/SHA anterior na aba Releases ou runs do workflow).
2. Republicar o artefato anterior no ambiente afetado (S3+CloudFront: sync do prefixo + invalidação de `index.html` apenas; Vercel/CF Pages: promote deploy anterior).
3. Hard refresh com cache limpo; verificar smoke mínimo (login → início).
4. Registrar em issue `incident`: causa, duração da exposição, ação corretiva.

## Notas
- Nunca editar artefato — rollback é reapontar, não rebuildar.
- Config runtime (`public/config.json`) errada é corrigida **sem** rollback: editar config e invalidar `config.json`.
- Se o problema for contrato da API (frontend novo × API velha): rollback do frontend e issue no backend, nunca hotfix de tipos à mão (ADR 003).

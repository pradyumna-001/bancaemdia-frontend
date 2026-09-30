# Runbook — Rollback

Alvo operacional: <7 minutos, a ensaiar em #14/#38. Ainda não há release implantado nem CD automático.

1. Identificar último release aprovado por SHA/digest e a configuração runtime correspondente, com contrato compatível da API.
2. No Compose de produção definido em #38, restaurar a imagem imutável anterior por digest. Preservar HTML, assets e nginx/CSP da mesma compilação; não reconstruir código antigo nem misturar HTML novo com hash antigo.
3. Manter Caddy/TLS e roteamento coerentes; verificar deep links, headers, tema e smoke real de sessão/consulta.
4. Registrar SHA/digest anterior/restaurado, motivo e duração em issue de incidente.

Configuração runtime inválida pode exigir restaurar sua versão revisada, sem alterar os assets; `config.json` tem no-store. Falha de contrato não se corrige editando tipos à mão. Antes de haver ambiente/release anterior, rollback não pode ser declarado testado apenas pelo build local.

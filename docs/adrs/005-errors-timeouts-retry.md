# ADR 005: Erros, acesso e recuperação

## Status

Revisado pelo ADR019 em 29/09/2026. Implementação #10/#13.

## Decision

| Estado                | Comportamento                                                                                                                   |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| 401                   | Renovar/reautenticar sem loop; destino interno validado                                                                         |
| 402 account_read_only | Manter sessão, consulta/exportação e formulário; explicar bloqueio e abrir Assinatura; não reenviar após pagamento sem intenção |
| 403/404               | Recurso indisponível com retorno contextual, sem revelar dados alheios                                                          |
| 409                   | Explicar código de conflito/estado/idempotência; nova prévia ou recarga quando pertinente, preservando entrada                  |
| 413                   | Limite informado e como reduzir arquivo                                                                                         |
| 422                   | Erros por campo; query inválida conhecida normaliza antes; filtro válido não é removido por fallback silencioso                 |
| 429                   | Respeitar Retry-After no recurso/ação afetado; não bloquear consulta independente sem necessidade                               |
| 500                   | Leitura idempotente pode tentar uma vez; erro persistente com saída útil                                                        |
| 503                   | Leitura segura com backoff/jitter até três tentativas; depois tentativa explícita                                               |
| Rede/timeout          | Preservar entrada; escrita pode ter ocorrido, reconciliar pelo contrato antes de repetir                                        |

GET10s, POST15s, upload60s. Abort de observação não cancela job remoto. Retentativa automática não transforma POST em operação segura; chave estável só onde contratada. Mensagens pt-BR, sem códigos internos/JSON/stack apresentados como copy.

Error Boundaries e 404/405/500 têm ações acessíveis. Carregamento reserva espaço quando pertinente; formulário estático não ganha skeleton obrigatório. Foco/anúncio acompanham erro, sem spinner infinito e sem repetir anúncios a cada polling. A matriz de acesso por operação é #52; calculadoras POST não implicam mutação financeira.

## Implementação #13 — 02/10/2026

A #13 (02/10/2026) complementa a recuperação com [páginas de erro e limites do boundary](../contracts/erros-de-rota.md). Layout protegido pai guarda Shell/RequireSession e boundary no filho preserva navegação sem contornar identidade. Falha no guard/layout sobe à recuperação externa. Endereço desconhecido, recurso indisponível e falha temporária têm mensagens distintas. Retorno usa ABAS/destino validado, conserva filtros/seção não secretos. Abrir novamente é GET explícito, nunca ressubmissão de action; Retry-After/navegação bloqueiam o botão. Resultado incerto não oferece reenvio. Foco não é retomado por polling/tema/expiração de prazo; falhas são injetadas somente na fixture isolada, com verificação do build público.

## Implementação #10 — 30/09/2026

[Contrato de recuperação](../contracts/recuperacao.md): `recuperacaoErro`/`ErroApi`, projeção segura de campos 422, paginação gerada do snapshot, QueryClient e `useRetryAfter`. HTTP429 tem até duas tentativas extras; rede/timeout de leitura até uma. Prazo automático acima de 60s termina em recuperação explícita, sem antecipar Retry-After. Mutations e resultados desconhecidos nunca entram em retry. Conflito sem motivo publicado mantém orientação conservadora; contexto de estado/prévia/idempotência exige prova na consumidora. Sessão/billing/telas continuam com as respectivas issues; demonstração visual somente no build de testes.

## Implementação #15 — 06/10/2026

[Acompanhamento de jobs](../contracts/jobs-upload.md) usa essas mesmas políticas de leitura/retry em um observador compartilhado por UUID e sessão. Consulta inicial em 1s, backoff por estabilidade até 30s, janela de 300 consultas/15min e retomada explícita respeitando Retry-After. Último unmount cancela GET/timers; logout/troca limpa projeções e descarta callbacks antigos. Estados terminais encerram a observação; parcial/limite/zero apostas e percentual ausente são preservados. Não reenvia upload, cancela processamento remoto ou cria aviso/aprovação de gasto. Integração da tela pertence à #24.

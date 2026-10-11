# Acompanhamento de jobs — #15

## Contrato verificado em 06/10/2026

`POST /api/v1/upload` aceita o arquivo e inicia processamento; a consumidora conserva o `job_id` retornado no 202. A #15 consulta exclusivamente `GET /api/v1/upload/{job_id}`. Envio/arquivo/URL da página pertencem à #24; montar, retomar ou atualizar o acompanhamento nunca inicia outro upload. Não há estimativa/aviso de custo nem etapa de aprovação de gasto, conforme decisão do titular registrada no ADR019.

Tipos: `UploadStatusResponse` e seu progresso vêm de [schema.d.ts](../../src/api/schema.d.ts), gerado do [commit/hash integrado adotado](../../config/api-contract.json). O snapshot `bd055417459f796fed960b5b37efb33a9744419f` e a main backend observada `8d5aea6bf4c9c99581910a8b1a2ed8c19edc65b8` têm os mesmos quatro estados no [modelo](https://github.com/pradyumna-001/bancaemdia-api/blob/bd055417459f796fed960b5b37efb33a9744419f/src/bancaemdia/models/upload.py) e a mesma [consulta de status](https://github.com/pradyumna-001/bancaemdia-api/blob/bd055417459f796fed960b5b37efb33a9744419f/src/bancaemdia/api/v1/upload.py). Schema publica `status: string`; validar os estados observados não é declarar outro shape de resposta.

| Status da API | Etapa                                     | Comportamento                                                   |
| ------------- | ----------------------------------------- | --------------------------------------------------------------- |
| `pending`     | Na fila                                   | Continuar observação; percentual não define conclusão           |
| `processing`  | Processando                               | Continuar observação; preservar contagens da API                |
| `completed`   | Processamento concluído                   | Encerrar consultas; distinguir completo, parcial e zero apostas |
| `failed`      | Não foi possível concluir o processamento | Encerrar consultas; manter contagens já informadas, sem reenvio |

`completed` é parcial se a API informa `bets_failed`, `progress.failed` ou `progress.over_limit` acima de zero; sem esses sinais e sem apostas processadas, resultado é vazio. Falhas/limites são contagens explícitas do servidor. O cliente não soma registros nem calcula percentual ou dinheiro. O erro textual arbitrário do trabalhador não tem código de motivo seguro publicado: apresentar etapa/mensagem genérica e as contagens, sem stack/JSON/texto bruto.

`projetarJob` recusa estado desconhecido, UUID divergente e contagens/percentual inválidos. O percentual presente é preservado; ausente/null permanece desconhecido, sem fabricar zero ou 100. A projeção contém somente identificador, estado e contagens/progresso: custos, estimativas, arquivo e erro bruto não ficam disponíveis à apresentação.

## Observação e recuperação

- Primeiro GET após **1 segundo**. Próximos intervalos usam `VITE_UPLOAD_POLL_MS`, limitado a 1–30s. Cada resposta sem mudança dobra a espera até 30s; mudança de estado/contagens/percentual volta ao intervalo base.
- Só agendar o próximo GET depois de concluir o anterior. Não usar `setInterval`, repetir POST ou seguir o `status_url` recebido. Dois consumidores do mesmo UUID e sessão compartilham um observador; StrictMode não duplica consultas.
- Mesma política da #10: HTTP500 permite 1 retry, HTTP503 3, HTTP429 2, rede/timeout 1, com backoff/jitter e `Retry-After`. Cancelamento, resposta inválida e demais recusas não repetem automaticamente. Uma leitura bem-sucedida zera falhas consecutivas.
- `Retry-After` acima de 60s interrompe retry automático. A data absoluta `retryAt` continua vinculada ao job; `retomar()` não antecipa esse prazo, nem ao desmontar/montar o consumidor.
- No máximo **300 consultas ou 15 minutos** por janela de acompanhamento, incluindo retries e GET pendente. Ao atingir o limite, interromper somente a observação e oferecer continuação explícita. `retomar()` reinicia essa janela pelo mesmo GET, mantendo autorização e cooldown.
- O último unmount aborta GET/timers, sem cancelar trabalho remoto. Remount volta a consultar o UUID conhecido quando a janela ainda permite; erro/limite exige retomada explícita. Referências/retornos antigos são descartados por geração e AbortSignal.

Fases `inativo/observando/encerrado/interrompido` descrevem o **observador local**, não estados adicionais do backend. Falha de consulta mantém o último progresso válido sem afirmar conclusão. Sem assinante, em leitura pendente, durante cooldown ou após estado terminal, `retomar()` retorna false e não dispara outra chamada.

## Sessão, URL e integração futura

`useJob(jobId)` exige sessão autenticada via ProvedorAuth. UUID inválido/ausente ou sessão indisponível produz estado inativo, sem GET/422. A futura tela restaura o UUID conhecido pela URL e repassa ao hook; isso não concede autorização. Cookies e validação de recurso continuam no servidor. Nenhum job/prova/token é salvo em storage ou BroadcastChannel.

O pool é exclusivo de SessionService/época privada. Logout/troca de usuário limpa projeções e timers sincronamente pelo registro de limpeza da #11; callbacks antigos não reativam outro contexto. GET usa o cliente tipado com cookie/no-store e `service.read`, preservando a recuperação limitada de sessão. HTTP402 não faz logout nem desabilita leituras por inferência de verbo; a API decide a permissão.

Contrato de uso na #24: iniciar `useJob(accepted.job_id)` somente depois do 202 ou de restaurar um job conhecido; mostrar etapa, `dados.progress.percent` apenas se fornecido, contagens/resultados e recuperação de `erro` pela #10. Ao interromper, a ação **Continuar acompanhamento** chama somente `retomar`. UUID não é URL de status arbitrária. Resultado desconhecido de upload sem UUID continua sendo tratado pela #9/#10, sem adivinhar um job ou reenviar arquivo.

## Evidências e limites

Vitest/Testing Library testa timers, concorrência, todos os estados, progresso ausente/inválido, parcial/limite/vazio, retries/cooldown, retorno tardio, remount, StrictMode, cookie/cliente tipado, HTTP401/402 e limpeza/troca de usuário. Fixtures ficam nos testes; nenhum controle de sessão ou cenário entra no aplicativo público.

A prova permanente de identidade continua com uma única versão pinada completa da API (`ad7cd9fb095ee6b1b9855504a42e23d25341dee2`). Nos dois viewports, cadastro/login reais e cookie autorizado consultam os quatro estados e resultado parcial/vazio, outro usuário recebe 404 e logout recebe 401. Apenas metadados de jobs descartáveis são semeados no banco isolado: não executa upload, trabalhador, extração/IA ou cobrança. Isso comprova contrato/autorização de leitura; não substitui a importação completa da #24.

Sem mudança de tela na #15. API/identidade produtivas ainda dependem do PR backend #168 e homologação #14. Não promover o schema de sandbox, chamar preparação de deploy ou afirmar processamento real de um export por estes testes.

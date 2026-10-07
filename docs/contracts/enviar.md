# Enviar export do Telegram — #24

## Jornada e versão

`/enviar` agora renderiza a importação dentro de RequireSession/Shell. Usa somente o contrato integrado `bd055417459f796fed960b5b37efb33a9744419f`, fixado em `config/api-contract.json`. O arquivo ZIP/JSON fica em memória; selecionar não envia. O botão **Enviar export** faz um único POST multipart `/api/v1/upload` com cookie e CSRF. Não atribuir idempotência não publicada nem repetir por erro/refresh.

O 202 significa aceitação, não conclusão. Somente o UUID válido retornado vira `?envio=UUID`; `status_url`, estimativas, custos e aviso bruto não entram na apresentação ou no storage. Filtros e fragmento são preservados. UUID inválido/duplicado não consulta nem reenvia; a pessoa pode removê-lo explicitamente ao escolher outro arquivo. Atualizar/voltar ao endereço consulta somente GET, com autorização de recurso no servidor.

O [observador da #15](jobs-upload.md) fornece etapas, contagens, percentual e resultado. Pausar remove a assinatura do GET; não existe cancelamento do job. Retomar consulta o mesmo UUID respeitando os limites e Retry-After. Completo, parcial, zero apostas e falha têm texto e saída; percentual desconhecido não vira zero. Nenhum dinheiro/percentual/total é calculado no cliente.

Conforme ADR019 e decisão do titular: envio → acompanhamento → resultado, sem estimativa/aviso de custo ou aprovação de gasto. Gasto máximo por usuário pertence ao backend.

## Arquivo e recusas

Entrada é um arquivo `.zip` ou `.json` não vazio. O servidor valida estrutura, tamanho, intervalo de cinco minutos e limite diário. Não há upload nativo de diretório nem limite de bytes presumido no cliente. JSON sem arquivos de fotos não promete importá-las. As instruções explicam compactar result.json com as fotos, preservando suas pastas; no celular basta escolher o arquivo preparado. Referência primária: [exportação do Telegram Desktop](https://telegram.org/blog/export-and-more).

413 pede arquivo menor; 400/422 permitem revisão com label local; 429 preserva a seleção e bloqueia o envio durante Retry-After. Sem código seguro para distinguir limite diário/intervalo, não interpretar mensagem bruta nem prometer um prazo diário. 401 usa recuperação da sessão sem replay; 402 preserva entrada e consulta, bloqueando somente esta operação recusada. Isso não substitui a matriz comercial completa da #52.

Timeout, rede, resposta 5xx ou 202 ilegível deixam o resultado desconhecido. O botão de envio fica bloqueado. **Conferir resultado** faz exclusivamente GET `/apostas?page=1&page_size=1&incluir_apagadas=true`, sem filtros: apresenta o total recebido e avisa que ele não identifica quais apostas vieram desse envio. Não usar uma página, total, arquivo ou ordem de registros para inferir conclusão. Falha dessa leitura tem recuperação própria. Após a consulta, iniciar um novo envio exige ação explícita e nova seleção, sem reutilizar o arquivo anterior.

Limitação real: essa versão não publica lista/reconciliação de uploads quando a resposta se perde antes de entregar UUID. O frontend explica essa ausência, não inventa identificador nem repete POST. Consulta não conclusiva continua sendo não conclusiva, inclusive total zero.

Logout/troca limpa arquivo e consultas pelo registro de limpeza da sessão; unmount aborta esperas locais. Resposta tardia, inclusive depois do parsing, não instala UUID/dados em outra sessão. Navegação não salva arquivo ou sessão em storage. Os outros canais (bot, prints web, planilha) têm texto que os distingue, sem botão funcional que leve a tela ainda indisponível.

## Provas

- Vitest cobre dupla confirmação, URL, recusas, leitura, resposta ambígua, limpeza e retorno tardio. Testes de #15 preservam autorização, timers finitos, todos os estados e isolamento.
- E2E apresenta a mesma página em fixture isolada, com sessões/respostas simuladas só em `tests/fixtures/`; valida multipart real do navegador, keyboard/foco, temas, axe e reflow. O build público permanece protegido.
- CI de identidade acrescenta dois testes obrigatórios, mobile/desktop, no **build público com CSP exata**. API completa pinada `ad7cd9fb095ee6b1b9855504a42e23d25341dee2`, cadastro/cookie reais, PostgreSQL isolado, Redis exclusivo e worker Celery real: ZIP selecionado pela SPA → POST → fila → parsing → extração por cache → materialização → aposta gravada → status completed; outro usuário recebe 404 e reload não repete POST.
- Apenas bytes e leitura sintéticos são entradas do teste/cache. Não semear uploads, progresso ou apostas finais. Uma armadilha HTTP local impede chamadas externas de IA; custo interno do teste é zero. A prova verifica o caminho com cache, não qualidade de extração inédita por IA ou produção. Mantém as oito provas anteriores, nove do backend e zero skips.

Dependências copiadas com escopo delimitado para PR independente contra main: arquivos `job/observarJob/useJob` e respectivos testes da PR #73 (#15); `format.ts`/teste da PR #69 (#16); correção de gasto em AGENTS/API-CONTRACTS/ADR019/backlog024 da PR #71 (#50). Reconciliar quando integradas ou alteradas. Nenhuma união de schema, alteração de backend ou merge administrativo.

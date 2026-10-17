# Telas de conta — #12

As rotas existentes agora apresentam a jornada real de acesso, substituindo os placeholders. A identidade e o transporte continuam em ProvedorAuth/#11; esta camada não recebe senha, e-mail, token ou código de confirmação e não cria endpoints alternativos.

| Página               | Ação                           | Intent na API            |
| -------------------- | ------------------------------ | ------------------------ |
| `/login`             | Entrar com minha conta         | `login`                  |
| `/criar-conta`       | Continuar para criar conta     | `signup`                 |
| `/esqueci-senha`     | Continuar para recuperar senha | `recover`                |
| `/redefinir-senha`   | Recomeçar recuperação          | `recover`                |
| `/confirmar-email`   | Continuar confirmação          | `login`                  |
| `/senha` (protegida) | Continuar para alterar senha   | `recover`                |
| `/sair` (protegida)  | Confirmar saída / cancelar     | POST de logout existente |

O contrato de [identidade](identidade.md) exige escolher cadastro/recuperação na própria página hospedada; `intent` não promete que todos os emissores abrirão diretamente o formulário correspondente. A interface explica esse próximo passo. Confirmação/redefinição são feitas pelo link do emissor, no navegador da solicitação. Os formulários, labels, autocomplete, validação por campo, mensagens genéricas, reenvio e limites pertencem ao emissor. A SPA não aceita um token recebido nessas páginas como confirmação e não cria formulário próprio de senha.

Cadastro não ativa assinatura/trial. Não existe contrato de convite ou fechamento de cadastro nessa referência: não expor uma funcionalidade inexistente, nem manter um placeholder que promete convite. Rotas desconhecidas seguem o 404 geral com saída acessível. Primeiro uso segue o destino válido (padrão Apostas); não há endpoint de onboarding que permita inferir estado local.

## Retorno e erros

Links entre jornadas preservam `destino` validado, filtros e seção. A API recebe só caminho/query. O fragmento não secreto mantém o mecanismo transitório da #11, consumido uma vez. A lista explícita de parâmetros de protocolo é removida da URL antes de renderizar; também é removida de destinos internos e fragmentos de protocolo, inclusive pares codificados. Não apresentar mensagens ou identidade baseadas em query params. A aplicação não registra esses valores nem os persiste. O backend continua responsável por consumir código/state e sanear seus logs/callback.

As telas públicas de conta consultam a sessão quando necessário para iniciar uma jornada; ajuda/tutorial não consultam. Conferência, API indisponível, rate limit e saída não confirmada bloqueiam o início de outro fluxo até tentativa explícita. Retry-After é respeitado; não há reenvio automático. Logout continua explícito e cancelável, sem prometer apagar apostas ou SSO do emissor.

Links expirados/repetidos e recuperação interrompida têm orientação, retorno para entrada e possibilidade de recomeçar o pedido. Concluir `intent=recover` revoga sessões locais anteriores conforme a API. Recuperação diretamente no emissor não notifica automaticamente esta API; a ajuda explica esse limite. Navegação hospedada é um documento externo: erros que o backend/emissor mostrar depois da navegação pertencem a esse documento; a SPA não intercepta, traduz ou falsifica a resposta. Se o serviço não abrir, retornar à página permite conferir e recomeçar. Localizar e homologar o emissor de produção é gate de publicação.

## Evidência e publicação

Vitest cobre cada intent, destino externo, continuidade, cancelamento de saída, 429/503, saída incerta e parâmetros transitórios. Playwright verifica o build público em três browsers/dois viewports, temas claro/escuro, Axe, teclado e reflow 320px. Capturas desses casos mostram páginas reais da aplicação com resposta HTTP de teste; não representam o emissor real nem autorização simulada.

A prova da #12 preserva **oito casos SPA reais** entre os quatorze do gate vigente, além de nove aceites backend, zero skips: os quatro da #11, cadastro/recuperação iniciados pelas páginas novas e confirmação expirada, cada um em 390×844/1440×900. Os novos casos usam formulários Keycloak26.7.4, Mailpit e PostgreSQL descartáveis; verificam ausência de usuário antes da confirmação, provisionamento único, link repetido sem nova sessão, recuperação interrompida sem revogação e recuperação concluída que preserva o usuário/revoga a sessão anterior. Para a expiração real, somente o realm descartável recebe lifetime temporário de um segundo, restaurado em finally; nenhum token é adulterado, nenhuma assinatura é simulada e o relógio não é congelado. [Fonte do lifetime](https://github.com/keycloak/keycloak/blob/26.7.4/services/src/main/java/org/keycloak/authentication/requiredactions/VerifyEmail.java).

Docker indisponível no Windows desta sessão: a prova real roda na CI Linux. Preview local exibe o aplicativo público, sem fixture que libere sessão; ausência da API produz erro recuperável. Capturas de emissor, credenciais, links de e-mail, traces/HAR e dados pessoais não entram em artifacts da identidade.

Backend #168 ainda é a referência pinada `ad7cd9fb095ee6b1b9855504a42e23d25341dee2`. Publicar exige integrar frontend/backend, adotar OpenAPI integrado e homologar provedor/SMTP/origens/ambiente. Nenhum contrato gerado foi promovido da PR, nenhum merge/deploy/provisionamento ocorreu nesta implementação.

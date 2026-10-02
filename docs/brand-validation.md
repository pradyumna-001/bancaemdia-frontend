# Validação de marca — issue #5

## Escopo

Assinatura tipográfica em componente único e favicon vetorial gerado da paleta. Cabeçalhos provisórios, login, erros e carregamento inicial exibem o mesmo nome; não há nova navegação.

## Verificações

- `make lint typecheck test build`: 176 testes unitários. As duas novas verificações exercitam resolução de cores do favicon e rejeição de tokens inválidos, para não produzir um ícone invisível.
- Playwright adiciona um caso de integração às seis combinações Chromium/Firefox/WebKit × móvel/desktop, totalizando 90 casos no CI. Verifica marca em login/tutorial/404 e falha de configuração, ambos os temas, nome acessível único no cabeçalho, título do documento e ausência de overflow.
- O favicon é requisitado como SVG e decodificado pelo navegador; não depende de CSS ou fonte externos. O smoke nginx confere também tipo de conteúdo, tokens resolvidos e marca sob a CSP real.
- Os testes existentes continuam verificando axe, foco e navegação. Nenhum teste foi desabilitado para acomodar a mudança de marca.
- Capturas `marca-claro.png` e `marca-escuro.png` ficam nos artefatos do CI com o relatório Playwright.

## Reprodução

`pnpm dev` serve o favicon pelo plugin; `pnpm build && pnpm preview` serve o SVG emitido. Confirmar em `/login` e `/nao-existe`, usando as opções de aparência.

Os checks do SHA final do PR são a fonte do resultado remoto. A limitação de Tab em links do WebKit para Windows permanece descrita na validação da #4; a matriz completa é executada em Linux.

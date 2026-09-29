# Validação da fundação visual — issue #4

## Contratos automatizados

- 174 testes unitários: regras anteriores, controlador de aparência, contraste dos dois temas, lint de paleta, WOFF2/swap e geração da CSP.
- O lint executa ESLint com a regra de cor e varredura de CSS, HTML e SVG. Fixtures incluem `#abc` em componente, funções modernas, nomes de cor e fallback literal em `var()`.
- Build produz HTML com tema antes do CSS/React e configuração nginx com SHA-256 do conteúdo exato. Scripts inline inesperados fazem o build falhar.
- Playwright mantém a matriz Chromium/Firefox/WebKit × 390×844/1440×900: 84 casos. Os casos novos cobrem escolha pelo sistema, persistência, mudanças de media query, sincronização entre abas, storage bloqueado, teclado, fontes locais e axe nos dois temas.
- O teste de pre-paint bloqueia o bundle React e exige que a preferência salva já esteja aplicada. Isso verifica independência do carregamento da aplicação, sem prometer medir todos os possíveis frames do navegador.
- O smoke da imagem nginx mantém as seis combinações de navegador/viewport e verifica tema após reload, fontes, fallback 404 e ausência de violações da CSP real.

## Execução local

Em Windows, `make lint typecheck test build` aprovado. Auditoria `pre-commit run --all-files` também executada.

Chromium: 28/28 e2e aprovados. WebKit: os oito casos novos de tema aprovados; a suíte completa teve 26/28, pois o WebKit para Windows pulou links no Tab do teste de navegação herdado e focou diretamente o rádio. A inspeção confirmou esse comportamento com uma página sem axe também. O teste e sua exigência de foco foram mantidos, sem skip ou afrouxamento. Firefox local possui impedimento de runtime do Windows já registrado na validação anterior.

A conclusão de compatibilidade depende da matriz completa e do nginx no CI Linux; os checks do SHA final do PR são a fonte da evidência remota. Não considerar o resultado local parcial como aprovação dessa matriz.

## Auditoria de fontes

Lighthouse 13.5.0 executado no build de produção em `/tutorial`, com emulação móvel e Chromium headless: `font-display-insight` aprovado (score 1, lista de problemas vazia), CLS 0. O score de desempenho observado foi 99; é uma medição local de placeholder, não um orçamento aprovado para as futuras telas. A auditoria foi executada separadamente, sem adicionar Lighthouse ao runtime nem antecipar o workflow completo da #8.

## Inspeção visual

Capturas reais dos temas Claro/Escuro em móvel e desktop foram inspecionadas: conteúdo legível, controles sem sobreposição, alinhamento e espaçamento consistentes. A tela ainda é um placeholder; não representa a marca nem o shell finais.

Os testes geram `fundacao-claro.png` e `fundacao-escuro.png` em `test-results/`, anexados ao artefato de validação do CI. O relatório HTML do Playwright acompanha o mesmo artefato.

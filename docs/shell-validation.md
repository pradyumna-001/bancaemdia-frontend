# Validação do shell — issue #6

## Implementação

Navegação desktop e mobile derivadas de `ABAS`, marca compartilhada, indicação de seção, registro de ícones, menu modal acessível e banner do ambiente. Revisão depende da consulta tipada da fila, com estados de carga, erro, retry e atualização pelo cache.

As telas continuam provisórias. O mock padrão de Revisão retorna fila vazia; transporte autenticado e sessão real pertencem às issues #10/#11.

## Cobertura

- 186 testes unitários, incluindo snapshot do catálogo, ícone desconhecido, contagem 12 → 0 → 120, valores inválidos, mensagens 429/503 e ausência de consulta sem sessão.
- 108 e2e na matriz Chromium/Firefox/WebKit × 390×844/1440×900. Os casos do shell exercitam temas, axe, Escape/devolução de foco, pular conteúdo, troca de seção, filtros na URL, histórico, fila vazia e recuperação de erro. Há inspeção adicional do menu em 320×568.
- Build público continua sem acesso ao shell sem sessão; abrir o caminho da fixture nele resulta na página 404. O cenário de sessão simulada só existe no build separado.
- O workflow preserva os checks existentes de lint, tipos, contrato gerado, build, pre-commit e nginx/CSP. A imagem nginx contém somente o `dist/` da aplicação.

## Demonstração isolada

Para revisar visualmente o shell antes da implementação de login:

```sh
pnpm exec vite build --config tests/fixtures/shell.vite.config.ts
pnpm exec vite preview --config tests/fixtures/shell.vite.config.ts --host 127.0.0.1 --port 4176 --strictPort
```

A demonstração usa sessão e fila simuladas, sem dados financeiros. O servidor separado responde com 12 itens fictícios; os testes interceptam esse endpoint para verificar outros estados. A entrada fica em `tests/fixtures/shell/` e a saída ignorada em `dist-shell-fixture/`; nenhuma é importada pela entrada normal. Não publicar esse diretório.

O Playwright inicia automaticamente a aplicação em 4173 e a demonstração em 4175. Não executar builds concorrentes sobre `dist/` enquanto esses testes estão rodando: isso substitui a configuração compilada que a suíte está verificando.

Capturas `shell-Claro.png`, `shell-Escuro.png` e `menu-320.png` acompanham o relatório no artefato do CI. Os checks do SHA final do PR registram o resultado remoto.

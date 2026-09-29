# Validação da configuração por ambiente (#2)

Validação executada em 29/09/2026 sobre `f376f2c73721f82117e14c479562eca0772a78b3`, baseada no scaffold do PR #40 (`90454212a98173eb0da7b0ab38a3bb6d84fec724`).

[Execução de aceitação no GitHub Actions — sucesso](https://github.com/pradyumna-001/bancaemdia-frontend/actions/runs/36599483731).

## Resultado

- Windows local: `make lint`, `make typecheck`, `make test` (55 testes), `make build`, `make gen-types` sem alterações no contrato e todos os hooks de pre-commit passaram.
- Ubuntu 24.04 / Node 22.22.0 / pnpm 10.34.6: instalação com lockfile congelado, mesmos checks, build, geração de tipos e pre-commit passaram.
- Playwright: **42 testes passaram**, sem retries, no build de produção. Chromium, Firefox e WebKit, cada um em 390×844 e 1440×900. Configuração válida, campos inválidos, falha HTTP, recuperação por teclado, bundle preservado, axe sem violações e ausência de overflow/erros de JavaScript nos cenários de recuperação.
- Screenshots da tela de erro e do scaffold nos seis projetos estão no artefato `issue-2-validation` da execução (retenção de 7 dias). Inspeção visual em mobile e desktop confirmou texto legível, botão acessível e ausência de recortes. A apresentação segue a base provisória do scaffold; tokens/tema são escopo da #4.
- Docker/Compose: build sem URL compilada, container UID 101, `nginx -t`, configuração via bind somente leitura, `application/json`, `no-store`, CSP e `nosniff` preservados.
- Navegação real contra o nginx nos três browsers: o mesmo ID de imagem e bundle iniciou com JSON de staging e de produção; `{}` sem URL mostrou erro; JSON malformado mostrou erro; corrigir o arquivo e tentar novamente recuperou a aplicação. Um segundo container sem `config.json` respondeu **404 real**, sem fallback para o HTML da SPA, e mostrou erro legível.
- Vite dev real: somente `VITE_API_URL` definida iniciou a aplicação; URL ausente ou inválida impediu a montagem. Nenhum desses cenários buscou `/config.json`.

Docker e a matriz completa de browsers foram executados no runner Linux. O host Windows não dispõe de Docker/WSL; o Firefox local possui falha de carregamento SideBySide. Essas limitações locais não substituíram a execução real em Linux.

## Reprodução e escopo

```bash
make install lint typecheck test build gen-types
pnpm exec playwright install --with-deps
make test:e2e
python -m pre_commit run --all-files
docker compose up -d --build
```

O [workflow pontual](https://github.com/pradyumna-001/bancaemdia-frontend/blob/f376f2c73721f82117e14c479562eca0772a78b3/.github/workflows/config-validation.yml) e seu [script de aceitação do runtime](https://github.com/pradyumna-001/bancaemdia-frontend/blob/f376f2c73721f82117e14c479562eca0772a78b3/.github/runtime-validation.mjs) permanecem acessíveis no commit validado. Foram removidos do diff final para preservar o escopo da #8. Após essa execução, somente este registro, seu link no README e a remoção desses dois arquivos mudaram; código da aplicação, testes, nginx e Compose são idênticos ao commit validado.

A #2 depende do PR #40 ainda aberto. Seu PR usa a branch do scaffold como base; após integrar #40, ajustar a base para `main` e conferir o diff antes do merge.

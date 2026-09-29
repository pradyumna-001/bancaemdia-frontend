# Validação do roteador e error boundaries (#3)

Registro histórico da primeira execução. Após a instrução do dono em 29/09/2026, a validação passou a ser permanente e obrigatória no commit final, conforme AGENTS regra 28 e ADR 008. Os checks atuais do PR #42 são a referência para sua entrega; a execução abaixo não substitui os checks do head.

Executada em 29/09/2026 sobre `6a0fa04a2fa8e4a4423e8a2915ced3ba6a1656c8`, baseada no PR #41 (`4b184f9591cabb2bd83d81705b936cbd9cdb1c4b`).

[Execução de aceitação no GitHub Actions — sucesso](https://github.com/pradyumna-001/bancaemdia-frontend/actions/runs/36602200645).

## Resultado

- Windows local: lint, TypeScript, **138 testes**, build, geração de tipos sem diff e todos os hooks de pre-commit aprovados.
- Ubuntu 24.04 / Node 22.22.0 / pnpm 10.34.6: instalação com lockfile congelado e todos os mesmos checks aprovados.
- Testes de componente: as 19 páginas renderizam com consulta de sessão injetada; ausência de sessão redireciona com filtros e fragmento preservados e substituição de histórico; wildcard mostra 404; falhas de loader e componente são contidas e recuperam por tentativa explícita; respostas HTTP 404/405/500 não expõem corpo cru; o QueryClient permanece o mesmo durante navegação.
- Destinos: 37 casos de URLs permitidas ou rejeitadas, incluindo autoridades externas, barras invertidas, controles, escapes inválidos, separadores codificados, caminhos normalizados e loops de autenticação.
- QueryClient real: testes de expiração do cache por recurso, limites de chamadas (500: duas no total; 503: quatro; demais/rede: uma), mutations sem repetição e backoff com jitter limitado.
- **60 e2e passaram**, sem retries: Chromium, Firefox e WebKit × 390×844 e 1440×900. Cobrem configuração, todas as páginas públicas com F5, todas as protegidas sem sessão, preservação de filtros/fragmento, destino externo, 404, navegação por teclado, histórico e navegação sem recarregar o documento.
- Axe sem violações nos cenários verificados; sem overflow horizontal ou erros JavaScript nos fluxos de recuperação/navegação. Screenshots de 404, login provisório e erro de configuração estão no artefato `issue-3-validation` (retenção de 7 dias). Inspeção visual de 404 em mobile/desktop e login mobile confirmou texto legível e ações sem recortes.
- Docker/Compose real: nginx como UID 101, configuração válida, fallback de rota profunda e CSP estrita preservados. Nos seis pares navegador/viewport, acesso direto e F5 em rotas públicas, redirecionamento de detalhe protegido com query/fragmento, 404 e carregamento do CSS passaram, sem violação de CSP no cenário verificado.

Docker e a matriz completa de navegadores foram executados em Linux; o Windows local não possui Docker/WSL e o Firefox instalado apresenta falha SideBySide. Não há login real nem bypass de sessão no build: somente testes de componente injetam sessão presente. Paleta, fontes, temas, shell e telas finais permanecem nas issues planejadas.

## Reprodução e rastreabilidade

```bash
make install lint typecheck test build gen-types
pnpm exec playwright install --with-deps
make test:e2e
python -m pre_commit run --all-files
docker compose up -d --build
```

O [workflow pontual](https://github.com/pradyumna-001/bancaemdia-frontend/blob/6a0fa04a2fa8e4a4423e8a2915ced3ba6a1656c8/.github/workflows/router-validation.yml) e o [script de verificação do nginx](https://github.com/pradyumna-001/bancaemdia-frontend/blob/6a0fa04a2fa8e4a4423e8a2915ced3ba6a1656c8/.github/router-validation.mjs) estão preservados no commit validado. Foram retirados do diff final para manter a CI permanente na #8. Depois da execução, somente este registro, o link no README e a remoção desses dois arquivos mudaram; código e testes permanecem idênticos.

O PR da #3 usa `feat/2-configuracao-ambiente` como base e depende do #41 (que depende do #40). Após integrar as dependências, ajustar a base para `main` e conferir o diff antes do merge.

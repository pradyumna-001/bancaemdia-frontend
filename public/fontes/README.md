# Source Sans 3 — arquivos locais

Origem: [Adobe / source-sans](https://github.com/adobe-fonts/source-sans/tree/87b37a2daaed80fcb8e8ccb0085c4d72ddade12e/WOFF2/OTF), commit `87b37a2daaed80fcb8e8ccb0085c4d72ddade12e`.

Arquivos originais apenas renomeados, sem alteração de conteúdo:

| Local                        | Original                       | Peso | SHA-256                                                          |
| ---------------------------- | ------------------------------ | ---- | ---------------------------------------------------------------- |
| source-sans-3-regular.woff2  | SourceSans3-Regular.otf.woff2  | 400  | 63de0da0cc05298e2e9c6e5cef506d8454ca665f6e668a99d94f51174b9256ed |
| source-sans-3-semibold.woff2 | SourceSans3-Semibold.otf.woff2 | 600  | c248b0a178c362916db7c853ed640db77f184d19a0ed9fa5591fa707d3089635 |
| source-sans-3-bold.woff2     | SourceSans3-Bold.otf.woff2     | 700  | 12954097ebbad6749ee1c81a143d555c263420115892211529fe6f51794b8439 |

Licença: SIL Open Font License 1.1, cópia original em [OFL-source-sans-3.md](OFL-source-sans-3.md). Carregamento pela mesma origem, sem CDN, com `font-display: swap`.

## Subconjuntos web — #37

Os três arquivos `bancaemdia-interface-*-latin.woff2` derivam dos originais acima.
Atendem português, latim básico, pontuação, moedas e os símbolos da interface.
Os três subconjuntos somam 60.872 bytes. As sub-rotinas CFF são expandidas
(`desubroutinize`), sem alterar contornos, hints ou avanços. Os originais completos continuam no fallback para outros
caracteres; nenhum alfabeto é removido da aplicação.

A família interna da versão modificada é **Bancaemdia Interface**, respeitando o
nome reservado `Source` da OFL. O desenho continua sendo o de Source Sans 3.
Copyright, licença e créditos permanecem nos arquivos. Ver [OFL sobre subconjuntos
e nomes reservados](https://openfontlicense.org/webfonts-and-reserved-font-names/).

Reprodução: `python -m pip install -r scripts/font-requirements.txt` e
`python scripts/subset-fonts.py`, na raiz do repositório. A ferramenta fixa versões,
confere os hashes de origem e compara contornos, avanços e recursos de números
tabulares/lining e kerning. [subsets.json](subsets.json) registra faixas, tamanhos e
checksums resultantes. CSS mantém os pesos 400/600/700, `font-display: swap` e as
mesmas métricas; preload usa apenas arquivos da própria origem.

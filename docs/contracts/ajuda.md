# Ajuda e exportação — #35

## Parcela adiantada em 16/10/2026

Tutorial `/tutorial` e Extensão `/extensao` são páginas públicas, com navegação própria, sem Shell, consulta de sessão, fila, billing ou dados privados. As ações encaminham às áreas protegidas existentes; o guard continua exigindo autenticação. `guia` seleciona o assunto na URL, com fallback para Telegram. Troca de assunto preserva filtros e leva o foco ao passo a passo. Links para Enviar escolhem explicitamente o canal, sem apagar filtros. Não interpretam filtros como autorização nem afirmam aplicá-los à ajuda.

São documentados export do Telegram, Prints, XLSX com prévia/confirmação, Nova aposta, bot por foto e Excel do Painel. O export de conversa e o bot não são o mesmo canal. O preparo no Telegram Desktop segue a [fonte oficial](https://telegram.org/blog/export-and-more), consultada em 16/10/2026: JSON e mídia são opções da exportação. A SPA orienta preservar result.json e fotos no ZIP; o JSON isolado não contém os bytes das fotos. Não há estimativa, autorização de custo, screenshots fabricados ou download público de registros.

Os passos refletem os consumidores de #24–29/#54/#58. Recebimento não prova materialização. Perda da resposta exige a consulta indicada pela tela; export legado sem identidade durável não ganha reconciliação fictícia. A prévia de planilha não grava apostas. Revisão, confirmação do bot e recibos continuam onde seus contratos os exigem. O bot não tem endereço público conhecido: a ajuda informa lançamento pendente e o link fictício interno de Conexões, sem t.me inventado.

## Excel privado

Reutilizar `ExportarPainel` de #20, sem um segundo downloader ou endpoint. O botão usa os seletores canônicos confirmados no diário para GET `/api/v1/painel/filtrado/detalhado/export`; a ajuda apenas retorna ao Painel com o recorte preservado. A janela diária visível não limita o arquivo. `painel.xlsx`, MIME XLSX, aborto/revogação, descarte após parsing, sessão/epoch, READ_ONLY, Retry-After e recuperação continuam protegidos pelos testes anteriores. Os resultados desse contrato são BRL, data da aposta e America/Sao_Paulo. Não prometer que saldo global ou evolução legada têm a mesma população. A exportação pessoal de #58 tem escopo global separado.

O E2E central real abre a ajuda, retorna ao Painel, baixa pelo botão da SPA e abre o workbook com openpyxl: abas Contexto/Resumo/Grupos/Tipsters por grupo/Diario, conta/casa/visibilidade, moeda/fuso e população/resultado esperados. O download temporário é removido. Essa prova executa nos três browsers e dois viewports, sem mocks; amplia o caso existente sem mudar seu inventário nem remover provas anteriores. E2E de apresentação cobre teclado, foco, dois temas, reflow 320px e ausência de requests privados nas páginas públicas.

## Distribuição da extensão — pendência de lançamento

Repositório responsável: [bancaemdia-extension-client](https://github.com/pradyumna-001/bancaemdia-extension-client). Auditoria via GitHub em 16/10/2026: main `ff62454ca798e52d338c40880b9de84021842ef1`, zero releases. O README dessa versão identifica o código como protótipo, ainda sem pareamento com API de produção; o pré-site não é endpoint de coleta. Não copiar ZIP do monólito, publicar instalação do protótipo como produto ou inventar versão/checksum/compatibilidade.

`/extensao` mostra **Esperando lançamento** e alternativas pelo site/celular. O repositório responsável é privado: não oferecer seu endereço como se fosse uma página pública de downloads. A página não consulta GitHub no browser. Quando a extensão publicar uma release revisada e acessível ao público, verificar tag, commit, artefato e SHA-256 no repositório responsável; fixar a procedência e os links exatos em nova alteração revisada, com instruções da versão e compatibilidade documentada. Não usar `/latest` como identidade de artefato. Essa parcela da #35 permanece aberta até existir a distribuição verificável.

## Dependências e estado

Implementação sobre frontend #97 (`39aa7ce`), com os consumidores herdados de #20/#24–30/#54/#58 e pin API ec46748 inalterado. PR contra main, com escopo próprio identificado. #34 aguarda projeção web de sessão; a ajuda não simula a tela Coleta, anuncia sessão funcionando ou usa credencial da extensão. O contrato da #34 e a distribuição verificável são pendências separadas: não impedem revisar esta parcela pública e não são declarados concluídos por ela.

A #35 permanece aberta, com referência em vez de fechamento automático. O aceite integral exige completar a parcela de lançamento e reconciliar as instruções com a #34. O sandbox continua bloqueado para produção até integração/revalidação administrativa; esta entrega não faz merge, deploy ou publicação da extensão.

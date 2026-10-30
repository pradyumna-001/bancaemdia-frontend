import type {
  Fila,
  Fonte,
  Pedido,
  Recibo,
  Revisao,
} from '../../src/features/revisao/protocol';
export const fonteRevisao: Fonte = {
  chave: 'aposta-leitura',
  papel: 'aposta',
  origem: 'extensao',
  casa: 'Betano',
  evento: 'Flamengo × Botafogo',
  descricao: 'Mais de 2,5 gols',
  mercado: 'Total de gols',
  data_jogo: '2026-10-15T22:00:00Z',
  data_aposta: '2026-10-14T17:30:00Z',
  tipster: 'Marina',
  tipster_id: '31',
  odd: 1.95,
  stake_unidades: 1,
  stake_centavos: '2500',
  valor_aposta_centavos: '2500',
  retorno_centavos: null,
  freebet: false,
  selecionada: true,
};
export const revisaoLeitura: Revisao = {
  id: '101',
  familia: 'leitura',
  motivo: 'leitura_incompleta',
  estado: 'aberta',
  criado_em: '2026-10-14T17:30:00Z',
  resolvido_em: null,
  precondicao: 'a'.repeat(64),
  acoes: ['CORRIGIR', 'DESCARTAR'],
  encaminhamento: 'resolver_aposta',
  resolver_url: null,
  foto_url: '/api/v1/revisao-operacional/revisoes/101/foto',
  fontes: [fonteRevisao],
  conta: null,
  par: null,
  print_casa: null,
  print_evento: null,
  print_descricao: null,
  print_odd: null,
  print_stake_unidades: null,
};
export const revisaoConta: Revisao = {
  ...revisaoLeitura,
  id: '102',
  familia: 'conta',
  motivo: 'atribuicao_conta',
  foto_url: null,
  acoes: ['CORRIGIR'],
  encaminhamento: 'resolver_conta',
  fontes: [
    { ...fonteRevisao, chave: 'aposta-conta', evento: 'Palmeiras × Santos' },
  ],
  conta: {
    casa: 'Betano',
    casa_id: '7',
    instante: '2026-10-15T22:00:00Z',
    criterio: 'data_jogo',
    status: 'AMBIGUOUS',
    status_na_abertura: 'AMBIGUOUS',
    conta_atual_id: null,
    encaminhamento: 'escolher_conta',
    candidatos: [
      {
        id: '9007199254740993',
        apelido: 'Principal',
        estado: 'EM_USO',
        ativa: true,
        titular: { id: '21', nome: 'Marina', arquivado: false },
        elegivel_escolha_explicita: true,
        coincide_no_dia_do_jogo: true,
      },
      {
        id: '12',
        apelido: 'Histórica',
        estado: 'ENCERRADA',
        ativa: false,
        titular: null,
        elegivel_escolha_explicita: true,
        coincide_no_dia_do_jogo: false,
      },
    ],
  },
};
export const revisaoPar: Revisao = {
  ...revisaoLeitura,
  id: '103',
  familia: 'consolidacao',
  motivo: 'fontes_a_consolidar',
  foto_url: null,
  acoes: ['MESMA', 'DISTINTAS', 'RECUSAR_VINCULO'],
  encaminhamento: 'resolver_par',
  fontes: [
    { ...fonteRevisao, papel: 'casa', evento: 'Grêmio × Internacional' },
    {
      ...fonteRevisao,
      chave: 'dica-telegram',
      papel: 'telegram',
      origem: 'telegram',
      evento: 'Grêmio × Internacional',
      tipster: 'Rafael',
      tipster_id: '32',
      stake_centavos: null,
      valor_aposta_centavos: null,
    },
  ],
  par: {
    tipo: 'casa_financeira_telegram_contextual',
    casa_chave: fonteRevisao.chave,
    telegram_chave: 'dica-telegram',
    tipster_opcoes: [
      { fonte: 'casa', rotulo: 'Casa', tipster: 'Marina', tipster_id: '31' },
      {
        fonte: 'telegram',
        rotulo: 'Telegram',
        tipster: 'Rafael',
        tipster_id: '32',
      },
    ],
    escolha_tipster_obrigatoria: true,
    concorrentes: 1,
    busca_incompleta: false,
  },
};
export const revisaoPrint: Revisao = {
  ...revisaoLeitura,
  id: '104',
  familia: 'print_incompleto',
  motivo: 'print_sem_aposta',
  encaminhamento: 'resolver_print',
  fontes: [],
  foto_url: null,
  print_casa: 'Betano',
  print_evento: 'Cruzeiro × Atlético-MG',
  print_descricao: 'Ambas marcam',
  print_odd: 2.1,
};
export function revisaoFixture() {
  const items = structuredClone([
    revisaoLeitura,
    revisaoConta,
    revisaoPar,
    revisaoPrint,
    {
      ...revisaoPar,
      id: '105',
      familia: 'par_legado',
      motivo: 'par_a_confirmar',
      fontes: revisaoPar.fontes.map((f) => ({
        ...f,
        evento: 'Bahia × Vitória',
      })),
      par: { ...revisaoPar.par!, tipo: 'legado' },
    } as Revisao,
    {
      ...revisaoLeitura,
      id: '106',
      familia: 'nao_suportada',
      motivo: 'motivo_nao_suportado',
      acoes: [],
      encaminhamento: 'suporte',
      foto_url: null,
      fontes: [],
    } as Revisao,
  ]);
  const receipts = new Map<string, Recibo>();
  return {
    items,
    receipts,
    handle(method: string, url: URL, body?: Pedido) {
      const path = url.pathname;
      if (path === '/api/v1/revisao/stats')
        return {
          status: 200,
          data: {
            total: items.filter((i) => i.estado === 'aberta').length,
            por_motivo: {},
            mais_antiga_em: null,
            idade_maxima_segundos: 0,
          },
        };
      if (path.endsWith('/fila')) {
        const open = items.filter((i) => i.estado === 'aberta');
        const filtered = open.filter(
          (i) =>
            (!url.searchParams.get('familia') ||
              i.familia === url.searchParams.get('familia')) &&
            (!url.searchParams.get('desde') ||
              Date.parse(i.criado_em) >=
                Date.parse(url.searchParams.get('desde')!)) &&
            (!url.searchParams.get('ate') ||
              Date.parse(i.criado_em) <
                Date.parse(url.searchParams.get('ate')!)),
        );
        const page = Number(url.searchParams.get('page') ?? 1),
          size = Number(url.searchParams.get('page_size') ?? 20);
        const data: Fila = {
          data: filtered.slice((page - 1) * size, page * size),
          page,
          page_size: size,
          total_filtrado: filtered.length,
          total_global: open.length,
          por_familia_filtrado: Object.fromEntries(
            [
              'leitura',
              'conta',
              'par_legado',
              'consolidacao',
              'print_incompleto',
              'nao_suportada',
            ].map((f) => [f, filtered.filter((i) => i.familia === f).length]),
          ),
          observado_em: '2026-10-15T16:00:00Z',
          politica_consumo: 'reiniciar_pagina_1_apos_resolver',
          criterio_idade: 'intervalo_criado_em',
        };
        return { status: 200, data };
      }
      if (path.includes('/operacoes/')) {
        const id = path.split('/').at(-1)!;
        const found = receipts.get(id);
        if (found) return { status: 200, data: found };
        if (method === 'GET')
          return {
            status: 404,
            data: { detail: 'review_intention_not_found' },
          };
        const item = items.find((i) => i.id === body?.revisao_id);
        if (!item || !body)
          return { status: 404, data: { detail: 'review_not_found' } };
        if (
          item.estado === 'resolvida' ||
          item.precondicao !== body.precondicao
        )
          return { status: 409, data: { detail: 'review_evidence_changed' } };
        const data: Recibo = {
          operacao_id: id,
          revisao_id: item.id,
          familia: item.familia,
          acao: body.acao,
          aposta_chave: body.acao === 'DESCARTAR' ? null : fonteRevisao.chave,
          confirmado_em: '2026-10-15T16:01:00Z',
          consultar_ate: '2027-01-13T16:01:00Z',
          eventos_gravados: 1,
        };
        receipts.set(id, data);
        item.estado = 'resolvida';
        item.acoes = [];
        return { status: 200, data };
      }
      const item = items.find((i) => i.id === path.split('/').at(-1));
      return item
        ? { status: 200, data: item }
        : { status: 404, data: { detail: 'review_not_found' } };
    },
  };
}

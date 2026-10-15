import type { components, operations } from '../../api/schema';
import { ApiError } from '../../api/error';
import {
  respostaPublicada,
  type ContratoLeitura,
} from '../../api/readContract';
import { SITE_READ_CONTRACT } from '../../api/site-read.generated';
import { REVISAO_POLICIES } from '../../api/revisao.generated';
import { diaValido, deslocarDia, inicioDia } from '../../lib/datasFiltro';
import { dataHora, moeda, odd } from '../../lib/format';
import {
  dataParaEntrada,
  pedidoCorrecao,
  type Rascunho,
} from '../apostas/detalhe/protocol';

export type Revisao = components['schemas']['ReviewView'];
export type Fila = components['schemas']['ReviewPage'];
export type Pedido = components['schemas']['ReviewDecision'];
export type Recibo = components['schemas']['ReviewReceipt'];
export type Fonte = components['schemas']['SourceEvidence'];
type Query =
  operations['queue_api_v1_revisao_operacional_fila_get']['parameters']['query'];
export const POST = 'POST /api/v1/revisao-operacional/operacoes/{operacao_id}';
export const FAMILIAS = {
  leitura: 'Leitura incompleta',
  conta: 'Escolher conta',
  par_legado: 'Conferir par',
  consolidacao: 'Vincular fontes',
  print_incompleto: 'Completar print',
  nao_suportada: 'Precisa de suporte',
} as const satisfies Record<Revisao['familia'], string>;
export const ACOES = {
  CORRIGIR: 'Salvar correção',
  DESCARTAR: 'Descartar revisão',
  MESMA: 'São a mesma aposta',
  DISTINTAS: 'São apostas distintas',
  RECUSAR_VINCULO: 'Recusar vínculo',
} as const satisfies Record<Pedido['acao'], string>;
export const EXPLICACOES = {
  leitura:
    'Confira a evidência e complete os campos que faltam antes de salvar.',
  conta: 'Escolha a conta desta aposta. A referência é a data do jogo.',
  par_legado:
    'Compare os dois registros e confirme se representam a mesma aposta.',
  consolidacao:
    'A casa fornece os valores financeiros; o Telegram fornece o contexto da dica.',
  print_incompleto:
    'Complete a leitura para criar a aposta ou descarte este print.',
  nao_suportada:
    'Esta pendência precisa de análise do suporte. Nenhuma alteração será enviada por aqui.',
} as const satisfies Record<Revisao['familia'], string>;
export const uuidValido = (value: string | null): value is string =>
  !!value &&
  /^[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}$/i.test(value);
import { idValido } from './identidade';
export { idValido, caminhoRevisao } from './identidade';
export function lerRevisao(params: URLSearchParams) {
  const single = (name: string) =>
    params.getAll(name).length === 1 ? params.get(name) : null;
  const rawFamily = single('motivo');
  const familia =
    rawFamily && Object.hasOwn(FAMILIAS, rawFamily)
      ? (rawFamily as Revisao['familia'])
      : undefined;
  let desde = single('aberta_desde') ?? undefined;
  let ate = single('aberta_ate') ?? undefined;
  if (!desde || !diaValido(desde)) desde = undefined;
  if (!ate || !diaValido(ate) || ate === '9999-12-31') ate = undefined;
  if (desde && ate && desde > ate) {
    desde = undefined;
    ate = undefined;
  }
  const rawPage = single('revisao_pagina');
  const page = rawPage && /^[1-9]\d{0,8}$/.test(rawPage) ? Number(rawPage) : 1;
  const query: Query = {
    page,
    page_size: 20,
    ...(familia ? { familia } : {}),
    ...(desde ? { desde: inicioDia(desde) } : {}),
    ...(ate ? { ate: inicioDia(deslocarDia(ate, 1)) } : {}),
  };
  return { familia, desde, ate, page, query };
}
function validar<T>(
  value: T | undefined,
  path: keyof typeof SITE_READ_CONTRACT,
): T {
  respostaPublicada(
    value,
    (SITE_READ_CONTRACT as ContratoLeitura)[path]?.response,
  );
  if (!value) throw new ApiError('invalid_response');
  return value;
}
export function validarRevisao(
  value: Revisao | undefined,
  id?: string,
): Revisao {
  const item = validar(
    value,
    '/api/v1/revisao-operacional/revisoes/{revisao_id}',
  );
  if (
    !idValido(item.id) ||
    (id && id !== item.id) ||
    !/^[a-f\d]{64}$/.test(item.precondicao) ||
    (item.estado === 'resolvida' && item.acoes.length)
  )
    throw new ApiError('invalid_response');
  dataHora(item.criado_em, 'America/Sao_Paulo');
  if (item.resolvido_em) dataHora(item.resolvido_em, 'America/Sao_Paulo');
  for (const fonte of item.fontes) {
    moeda(fonte.stake_centavos);
    moeda(fonte.valor_aposta_centavos);
    moeda(fonte.retorno_centavos);
    odd(fonte.odd);
    for (const date of [fonte.data_jogo, fonte.data_aposta])
      if (date) dataHora(date, 'America/Sao_Paulo');
  }
  if (item.conta?.candidatos.some((c) => !idValido(c.id)))
    throw new ApiError('invalid_response');
  return item;
}
export function validarFila(value: Fila | undefined): Fila {
  const policy = REVISAO_POLICIES['GET /api/v1/revisao-operacional/fila'];
  if (
    policy.consumption !== 'restart_page_1' ||
    policy.read_source !== 'primary_snapshot'
  )
    throw new ApiError('invalid_response');
  const fila = validar(value, '/api/v1/revisao-operacional/fila');
  dataHora(fila.observado_em, 'America/Sao_Paulo');
  fila.data.forEach((item) => validarRevisao(item));
  return fila;
}
export function validarRecibo(
  value: Recibo | undefined,
  id: string,
  body?: Pedido,
): Recibo {
  const r = validar(
    value,
    '/api/v1/revisao-operacional/operacoes/{operacao_id}',
  );
  if (
    !uuidValido(r.operacao_id) ||
    r.operacao_id !== id ||
    !idValido(r.revisao_id) ||
    (body && (r.revisao_id !== body.revisao_id || r.acao !== body.acao))
  )
    throw new ApiError('invalid_response', { mutation: true });
  dataHora(r.confirmado_em, 'America/Sao_Paulo');
  dataHora(r.consultar_ate, 'America/Sao_Paulo');
  return r;
}
export function rascunhoInicial(item: Revisao): Rascunho {
  const fonte = item.fontes[0];
  return {
    casa: fonte?.casa ?? item.print_casa ?? '',
    evento: fonte?.evento ?? item.print_evento ?? '',
    descricao: fonte?.descricao ?? item.print_descricao ?? '',
    mercado_bruto: fonte?.mercado ?? '',
    odd: String(fonte?.odd ?? item.print_odd ?? '').replace('.', ','),
    stake_unidades: String(
      fonte?.stake_unidades ?? item.print_stake_unidades ?? '',
    ).replace('.', ','),
    data_jogo: dataParaEntrada(fonte?.data_jogo ?? null),
    data_aposta: dataParaEntrada(fonte?.data_aposta ?? null),
    comissao_centavos: '',
    freebet: fonte?.freebet ?? false,
  };
}
export function decidir(
  item: Revisao,
  acao: Pedido['acao'],
  draft: Rascunho,
  conta: string,
  tipster: string,
): Pedido {
  if (item.estado !== 'aberta' || !item.acoes.includes(acao))
    throw new Error('Consulte a pendência atual antes de continuar.');
  const body: Pedido = {
    revisao_id: item.id,
    precondicao: item.precondicao,
    acao,
  };
  if (acao === 'CORRIGIR' && item.familia === 'conta') {
    if (
      !item.conta?.candidatos.some(
        (c) => c.id === conta && c.elegivel_escolha_explicita,
      )
    )
      throw new Error('Escolha uma conta válida para esta aposta.');
    body.conta_casa_id = conta;
  } else if (acao === 'CORRIGIR') {
    const initial = rascunhoInicial(item);
    if (!initial.stake_unidades && !String(draft.stake_unidades ?? '').trim())
      throw new Error('Informe o valor em unidades que falta na leitura.');
    body.aposta_corrigida = pedidoCorrecao(draft, initial);
    if (!initial.stake_unidades && !body.aposta_corrigida.stake_unidades)
      throw new Error('Informe o valor em unidades que falta na leitura.');
  }
  if (acao === 'MESMA' && item.par) {
    if (
      item.par.escolha_tipster_obrigatoria &&
      !item.par.tipster_opcoes.some((t) => t.fonte === tipster)
    )
      throw new Error('Escolha o tipster que deve ficar na aposta.');
    if (tipster === 'casa' || tipster === 'telegram')
      body.tipster_choice = tipster;
  }
  return body;
}

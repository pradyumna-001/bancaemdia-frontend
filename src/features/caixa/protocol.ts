import type { components, operations } from '../../api/schema';
import { ApiError } from '../../api/error';
import {
  respostaPublicada,
  type ContratoLeitura,
} from '../../api/readContract';
import { SITE_READ_CONTRACT } from '../../api/site-read.generated';
import { paginacaoConsulta } from '../../api/query';
import { diaValido, deslocarDia, inicioDia } from '../../lib/datasFiltro';
import {
  centavosDaEntrada,
  centavosComSinalDaEntrada,
  dataHora,
  moeda,
} from '../../lib/format';
import { identificador } from '../contas/protocol';

export type Saldo =
  components['schemas']['bancaemdia__api__v1__caixa__SaldoSaida'];
export type ContaSaldo = components['schemas']['SaldoContaSaida'];
export type Matriz = components['schemas']['MatrizCasaSaida'];
export type Movimento = components['schemas']['MovimentoSaida'];
export type Pedido = components['schemas']['MovimentoNovo'];
export type Recibo = components['schemas']['MovimentoCriadoSaida'];
export type Movimentos = components['schemas']['MovimentosPaginaSaida'];
export type Extrato = components['schemas']['ExtratoSaida'];
export type Vinculo = components['schemas']['VinculoBancaSaida'];
export const POST = 'POST /api/v1/caixa';
export const PATCH = 'PATCH /api/v1/caixa/contas/{conta_casa_id}/banca';
export const TIPOS = {
  DEPOSITO: 'Depósito',
  SAQUE: 'Saque',
  AJUSTE: 'Ajuste',
  TRANSFERENCIA: 'Transferência',
  BONUS: 'Bônus',
} as const satisfies Record<Movimento['tipo'], string>;
export const TIPOS_ENTRADA = [
  'DEPOSITO',
  'SAQUE',
  'TRANSFERENCIA',
  'AJUSTE',
] as const satisfies readonly Pedido['tipo'][];
export function validar<T>(value: T | undefined, operation: string): T {
  respostaPublicada(
    value,
    (SITE_READ_CONTRACT as ContratoLeitura)[operation]?.response,
  );
  if (!value) throw new ApiError('invalid_response');
  return value;
}
export function validarSaldo(value: Saldo | undefined): Saldo {
  const saldo = validar(value, '/api/v1/caixa/saldo');
  for (const conta of saldo.contas) {
    if (conta.saldo_confiavel !== (conta.saldo_atual_centavos !== null))
      throw new ApiError('invalid_response');
    if (conta.desde) dataHora(conta.desde, 'America/Sao_Paulo');
  }
  return saldo;
}
export function validarExtrato(value: unknown): Extrato {
  // Runtime validation includes the published null liquidation field and both union arms.
  return validar(value as Extrato | undefined, '/api/v1/caixa/extrato');
}
export function validarMovimento(value: Movimento) {
  moeda(value.valor_centavos);
  dataHora(value.ocorrido_em, 'America/Sao_Paulo');
}
export function validarRecibo(value: Recibo | undefined, body: Pedido): Recibo {
  const recibo = validar(value, POST);
  if (
    recibo.tipo !== body.tipo ||
    recibo.movimentos.length !== (body.tipo === 'TRANSFERENCIA' ? 2 : 1)
  )
    throw new ApiError('invalid_response', { mutation: true });
  for (const move of recibo.movimentos) validarMovimento(move);
  if (body.tipo === 'TRANSFERENCIA') {
    if (
      !recibo.transferencia_id ||
      new Set(recibo.movimentos.map((m) => m.conta_casa_id)).size !== 2 ||
      !recibo.movimentos.some((m) => m.conta_casa_id === body.conta_casa_id) ||
      !recibo.movimentos.some(
        (m) => m.conta_casa_id === body.conta_casa_destino_id,
      ) ||
      recibo.movimentos.some(
        (m) =>
          m.transferencia_id !== recibo.transferencia_id ||
          m.tipo !== 'TRANSFERENCIA',
      )
    )
      throw new ApiError('invalid_response', { mutation: true });
  } else if (
    recibo.movimentos[0]!.conta_casa_id !== (body.conta_casa_id ?? null) ||
    recibo.movimentos[0]!.tipo !== body.tipo
  )
    throw new ApiError('invalid_response', { mutation: true });
  return recibo;
}
export function instanteDaEntrada(text: string) {
  const match =
    /^(\d{2})\/(\d{2})\/(\d{4}) (\d{2}:\d{2}(?::\d{2})?)(Z|[+-]\d{2}:\d{2})$/.exec(
      text.trim(),
    );
  if (!match)
    throw new Error(
      'Informe dia/mês/ano, hora e fuso, como 13/10/2026 14:30-03:00.',
    );
  const day = `${match[3]}-${match[2]}-${match[1]}`;
  if (!diaValido(day)) throw new Error('Confira a data informada.');
  const result = `${day}T${match[4]!.length === 5 ? match[4] + ':00' : match[4]}${match[5]}`;
  dataHora(result, 'America/Sao_Paulo');
  return result;
}
export function pedido(input: {
  tipo: Pedido['tipo'];
  valor: string;
  origem: string;
  destino: string;
  instante: string;
  descricao: string;
}): Pedido {
  const valor =
    input.tipo === 'AJUSTE'
      ? centavosComSinalDaEntrada(input.valor)
      : centavosDaEntrada(input.valor);
  if (valor === 0) throw new Error('Informe um valor diferente de zero.');
  const origem =
    input.origem === 'global' && input.tipo === 'AJUSTE'
      ? null
      : identificador(input.origem);
  const destino =
    input.tipo === 'TRANSFERENCIA' ? identificador(input.destino) : undefined;
  if (
    origem === undefined ||
    (input.tipo === 'TRANSFERENCIA' &&
      (destino === undefined || destino === origem))
  )
    throw new Error(
      'Escolha as contas; a transferência precisa de duas contas diferentes.',
    );
  return {
    tipo: input.tipo,
    valor_centavos: valor,
    conta_casa_id: origem,
    ...(destino ? { conta_casa_destino_id: destino } : {}),
    ocorrido_em: instanteDaEntrada(input.instante),
    descricao: input.descricao.trim() || null,
  };
}
export function lerCaixa(search: URLSearchParams) {
  const invalidos: string[] = [];
  const single = (name: string) =>
    search.getAll(name).length === 1 ? search.get(name)! : undefined;
  const id = (name: string) => {
    const raw = single(name);
    const value = identificador(raw);
    if (search.has(name) && value === undefined) invalidos.push(name);
    return value;
  };
  const day = (name: string) => {
    const raw = single(name);
    if (raw && diaValido(raw)) return raw;
    if (search.has(name)) invalidos.push(name);
  };
  const conta = id('caixa_conta'),
    titular = id('caixa_titular');
  let desde = day('caixa_desde'),
    ate = day('caixa_ate');
  if (desde && ate && desde > ate) {
    desde = undefined;
    ate = undefined;
    invalidos.push('período');
  }
  const corte = day('data_corte');
  const rawTipo = single('caixa_tipo');
  const tipo =
    rawTipo && Object.hasOwn(TIPOS, rawTipo)
      ? (rawTipo as Movimento['tipo'])
      : undefined;
  if (search.has('caixa_tipo') && !tipo) invalidos.push('tipo');
  const rawSecao = single('caixa');
  const secao =
    rawSecao === 'movimentos' || rawSecao === 'extrato' ? rawSecao : 'saldos';
  if (
    search.has('caixa') &&
    !['saldos', 'movimentos', 'extrato'].includes(rawSecao ?? '')
  )
    invalidos.push('seção');
  const params = new URLSearchParams();
  if (single('caixa_pagina')) params.set('page', single('caixa_pagina')!);
  const pagination = paginacaoConsulta('GET /api/v1/caixa', params);
  if (
    search.has('caixa_pagina') &&
    String(pagination.page) !== single('caixa_pagina')
  )
    invalidos.push('página');
  const query: NonNullable<
    operations['listar_movimentos_api_v1_caixa_get']['parameters']['query']
  > = {
    page: pagination.page,
    page_size: 20,
    ...(conta ? { conta_casa_id: conta } : {}),
    ...(desde ? { desde: inicioDia(desde) } : {}),
    ...(ate ? { ate: inicioDia(deslocarDia(ate, 1)) } : {}),
  };
  return {
    secao,
    invalidos,
    conta,
    titular,
    tipo,
    desde,
    ate,
    corte,
    page: pagination.page,
    query,
  };
}
export function rotuloConta(conta: ContaSaldo, matriz?: Matriz) {
  const label = matriz?.contas.find(
    (item) => item.conta_casa_id === conta.conta_casa_id,
  );
  return label
    ? `${label.titular_nome ?? 'Sem titular'} · ${label.casa_nome} · ${label.apelido || 'Conta sem apelido'}`
    : `${conta.apelido || 'Conta'} · casa ${conta.casa_id} · identificação pendente`;
}

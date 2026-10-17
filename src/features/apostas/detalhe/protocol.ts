import type { components } from '../../../api/schema';
import { ApiError } from '../../../api/error';
import {
  respostaPublicada,
  type ContratoLeitura,
} from '../../../api/readContract';
import {
  centavosDaEntrada,
  dataHora,
  decimal,
  moeda,
  odd,
} from '../../../lib/format';
import { ESTADOS_APOSTA, rotuloEstado } from '../../../lib/termos';
import { projetarAposta } from '../projecao';

export type Detalhe = components['schemas']['BetDetailResponse'];
export type Correcao = components['schemas']['Correcao'];
export type Resultado = components['schemas']['Resultado'];
export type Revisao = components['schemas']['RevisaoSaida'];
export type Rascunho = Partial<Record<keyof Correcao, string | boolean>>;
export const CAMPOS = [
  ['evento', 'Evento', 'texto'],
  ['descricao', 'Descrição', 'texto'],
  ['mercado_bruto', 'Mercado', 'texto'],
  ['casa', 'Casa', 'texto'],
  ['odd', 'Odd', 'decimal'],
  ['stake_unidades', 'Valor em unidades', 'decimal'],
  ['comissao_centavos', 'Comissão (R$)', 'moeda'],
  ['data_aposta', 'Data/hora da aposta', 'data'],
  ['data_jogo', 'Data/hora do jogo', 'data'],
] as const satisfies readonly (readonly [keyof Correcao, string, string])[];

export function validarDetalhe(
  value: Detalhe | undefined,
  key: string,
  contrato: ContratoLeitura,
): Detalhe {
  respostaPublicada(value, contrato['/api/v1/apostas/{chave}']?.response);
  if (!value || value.aposta.chave !== key)
    throw new ApiError('invalid_response');
  projetarAposta(value.aposta);
  moeda(value.aposta.stake_centavos);
  return value;
}
export function validarMudanca(
  value: unknown,
  key: string,
  operation: string,
  contrato: ContratoLeitura,
) {
  const root = respostaPublicada(value, contrato[operation]?.response);
  const aposta = root.aposta as components['schemas']['BetResponse'];
  if (aposta.chave !== key)
    throw new ApiError('invalid_response', { mutation: true });
  projetarAposta(aposta);
}
export function dataParaEntrada(value: string | null): string {
  if (!value) return '';
  dataHora(value, 'America/Sao_Paulo');
  const [day, time] = value.split('T');
  return day!.split('-').reverse().join('/') + ' ' + time;
}
function dataDaEntrada(value: string): string {
  const m =
    /^(\d{2})\/(\d{2})\/(\d{4}) (\d{2}:\d{2}(?::\d{2}(?:\.\d{1,6})?)?)(Z|[+-]\d{2}:\d{2})$/.exec(
      value.trim(),
    );
  if (!m) throw new Error('Informe dia/mês/ano, hora e fuso.');
  const time = m[4]!.length === 5 ? m[4] + ':00' : m[4];
  const result = `${m[3]}-${m[2]}-${m[1]}T${time}${m[5]}`;
  dataHora(result, 'America/Sao_Paulo');
  const civil = `${m[3]}-${m[2]}-${m[1]}`;
  if (new Date(civil + 'T12:00:00Z').toISOString().slice(0, 10) !== civil)
    throw new Error('Confira a data.');
  return result;
}
export function valoresIniciais(detail: Detalhe): Rascunho {
  const a = detail.aposta;
  return {
    evento: a.evento ?? '',
    descricao: a.descricao ?? '',
    mercado_bruto: detail.selecoes.mercado ?? '',
    casa: a.casa ?? '',
    odd: a.odd === null ? '' : String(a.odd).replace('.', ','),
    stake_unidades: String(a.stake_unidades).replace('.', ','),
    comissao_centavos: '',
    data_aposta: dataParaEntrada(a.data_aposta),
    data_jogo: dataParaEntrada(a.data_jogo),
    freebet: a.freebet,
  };
}
export function pedidoCorrecao(draft: Rascunho, initial: Rascunho): Correcao {
  const body: Correcao = {};
  for (const [field, , kind] of CAMPOS) {
    const value = draft[field];
    if (value === initial[field] || typeof value !== 'string') continue;
    if (kind === 'texto') body[field as 'evento'] = value.trim() ? value : null;
    else if (kind === 'data')
      body[field as 'data_jogo'] = value.trim() ? dataDaEntrada(value) : null;
    else if (kind === 'moeda') {
      if (value.trim()) body.comissao_centavos = centavosDaEntrada(value);
    } else {
      if (!/^\d+(?:[,.]\d+)?$/.test(value.trim()))
        throw new Error('Confira os números informados.');
      const number = Number(value.trim().replace(',', '.'));
      if (
        !Number.isFinite(number) ||
        number <= 0 ||
        (field === 'odd' && (number < 1.01 || number > 1000))
      )
        throw new Error('Confira a odd e o valor em unidades.');
      body[field as 'odd'] = number;
    }
  }
  if (draft.freebet !== initial.freebet && typeof draft.freebet === 'boolean')
    body.freebet = draft.freebet;
  return body;
}
export function pedidoResultado(estado: string, valor: string): Resultado {
  if (!Object.hasOwn(ESTADOS_APOSTA, estado))
    throw new Error('Escolha o resultado.');
  const body: Resultado = { estado: estado as Resultado['estado'] };
  if (estado === 'CASHOUT')
    body.cashout_valor_centavos = centavosDaEntrada(valor);
  return body;
}

const EVENTOS: Record<string, string> = {
  APOSTA_CRIADA: 'Aposta recebida',
  CORRECAO_MANUAL: 'Correção manual',
  RESULTADO_REGISTRADO: 'Resultado registrado',
  CASHOUT_REGISTRADO: 'Cashout registrado',
  APOSTA_CANCELADA: 'Aposta apagada',
  SELECAO_ALTERADA: 'Inclusão na apuração alterada',
  REVISAO_RESOLVIDA: 'Revisão resolvida',
  APOSTAS_CONSOLIDADAS: 'Fontes vinculadas',
  CONSOLIDACAO_DESVINCULADA: 'Fontes desvinculadas',
  CONSOLIDACAO_REJEITADA: 'Vínculo recusado',
};
export function eventoApresentacao(evento: Detalhe['eventos'][number]) {
  const campos: Array<{ label: string; value: string }> = [];
  const payload = evento.payload;
  const textos = {
    evento: 'Evento',
    descricao: 'Descrição',
    casa: 'Casa',
    mercado_bruto: 'Mercado',
  };
  for (const [field, label] of Object.entries(textos)) {
    const value = payload[field];
    if (typeof value === 'string' || value === null)
      campos.push({ label, value: value ?? 'Não informado' });
  }
  for (const [field, label] of [
    ['retorno_centavos', 'Retorno'],
    ['stake_centavos', 'Custo próprio'],
    ['valor_aposta_centavos', 'Valor de face'],
    ['comissao_centavos', 'Comissão'],
  ] as const) {
    const v = payload[field];
    if (v === null || typeof v === 'number') {
      try {
        campos.push({ label, value: moeda(v) });
      } catch {
        campos.push({ label, value: 'Não informado' });
      }
    }
  }
  if (typeof payload.odd === 'number')
    campos.push({ label: 'Odd', value: odd(payload.odd) });
  if (typeof payload.stake_unidades === 'number')
    campos.push({
      label: 'Valor em unidades',
      value: decimal(payload.stake_unidades),
    });
  if (typeof payload.estado === 'string')
    campos.push({ label: 'Estado', value: rotuloEstado(payload.estado) });
  return {
    titulo: EVENTOS[evento.tipo] ?? 'Atualização registrada',
    instante: dataHora(evento.criado_em, 'America/Sao_Paulo'),
    origem:
      evento.fonte === 'manual'
        ? 'Manual'
        : evento.fonte === 'telegram'
          ? 'Telegram'
          : evento.fonte === 'extensao'
            ? 'Coleta'
            : 'Serviço',
    campos,
  };
}
export function parceiraDaRevisao(
  revisao: Revisao | undefined,
): string | undefined {
  const key = revisao?.extracao_bruta?.parceira_suspeita;
  return typeof key === 'string' && key.trim() ? key : undefined;
}

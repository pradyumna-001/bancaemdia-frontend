import type { components } from '../../src/api/schema';
import { conta } from './contas';
export const matrizTroca: components['schemas']['MatrizCasaSaida'] = {
  casa_id: 7,
  casa_nome: 'Betano',
  proxima_acao_sem_conta: 'CRIAR_CONTA',
  titulares_sem_conta: [],
  contas: [
    {
      ...conta,
      conta_casa_id: 11,
      apelido: 'Conta principal',
      estado: 'EM_USO',
      ativa: true,
      intervalo_ativo: {
        vigente_de: '2026-01-01T12:00:00Z',
        vigente_ate: null,
        origem: 'EXPLICITA',
      },
      acoes_validas: ['TROCAR_DE', 'EDITAR'],
    },
    {
      ...conta,
      conta_casa_id: 12,
      titular_id: 2,
      titular_nome: 'Rafael',
      apelido: 'Conta reserva',
      acoes_validas: ['TROCAR_PARA', 'EDITAR'],
    },
    {
      ...conta,
      conta_casa_id: 13,
      apelido: 'Conta encerrada',
      estado: 'ENCERRADA',
      acoes_validas: [],
    },
  ],
};
export const pedidoTroca: components['schemas']['TrocaContaEntrada'] = {
  casa_id: 7,
  conta_origem_id: 11,
  conta_destino_id: 12,
  efetiva_em: '2026-10-01T14:30:00-03:00',
  estado_origem: 'LIMITADA',
};
export const previaTroca: components['schemas']['TrocaContaSaida'] = {
  ...pedidoTroca,
  aplicada: false,
  apostas_afetadas_ids: [1042, 1048, 1051],
};
export function createTrocaFixture() {
  const matrix = structuredClone(matrizTroca);
  const intents = new Map<
    string,
    components['schemas']['TrocaIntencaoSaida']
  >();
  return {
    handle(
      method: string,
      url: URL,
      key: string,
      body?: components['schemas']['TrocaContaEntrada'],
    ) {
      if (url.pathname === '/api/v1/titulares/casas/7/matriz') return matrix;
      if (url.pathname.endsWith('/trocas/intencao')) return intents.get(key);
      if (
        method === 'POST' &&
        url.pathname.endsWith('/trocas/preview') &&
        body
      ) {
        if (!intents.has(key))
          intents.set(key, {
            estado: 'PREVIEW',
            previa: {
              ...body,
              aplicada: false,
              apostas_afetadas_ids: previaTroca.apostas_afetadas_ids,
            },
            previa_expira_em: '2030-01-01T00:00:00Z',
            recibo: null,
          });
        return intents.get(key)!.previa;
      }
      if (method === 'POST' && url.pathname.endsWith('/trocas')) {
        const intent = intents.get(key);
        if (!intent) return;
        intent.estado = 'APPLIED';
        intent.recibo ??= { ...intent.previa, aplicada: true };
        const previous = matrix.contas.find(
          (a) => a.conta_casa_id === intent.previa.conta_origem_id,
        )!;
        const next = matrix.contas.find(
          (a) => a.conta_casa_id === intent.previa.conta_destino_id,
        )!;
        previous.estado = intent.previa.estado_origem;
        previous.ativa = false;
        previous.acoes_validas =
          previous.estado === 'DISPONIVEL'
            ? ['ATIVAR', 'TROCAR_PARA', 'EDITAR']
            : ['EDITAR'];
        if (previous.intervalo_ativo)
          previous.historico_uso = [
            {
              ...previous.intervalo_ativo,
              vigente_ate: intent.previa.efetiva_em,
            },
          ];
        previous.intervalo_ativo = null;
        next.estado = 'EM_USO';
        next.ativa = true;
        next.acoes_validas = ['TROCAR_DE', 'EDITAR'];
        next.intervalo_ativo = {
          vigente_de: intent.previa.efetiva_em,
          vigente_ate: null,
          origem: 'EXPLICITA',
        };
        return intent.recibo;
      }
    },
  };
}

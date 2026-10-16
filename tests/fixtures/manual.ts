import type { components } from '../../src/api/schema';
export const manualId = 'af31800d-6b75-4faf-91b4-1690a48e984a';
export const manualKey = 'm:0123456789abcdef0123456789abcdef';
export const reciboManual = {
  intencao_id: manualId,
  estado: 'confirmada',
  aposta_chave: manualKey,
  detalhe_url: '/api/v1/apostas/' + manualKey,
  confirmado_em: '2026-10-15T17:00:00Z',
  recuperavel_ate: '2027-01-13T17:00:00Z',
  confirmacao_original: {
    data_aposta: '2026-10-15T17:00:00Z',
    data_jogo: null,
    conta_casa_id: null,
    criterio_conta: 'data_jogo',
    valor_unidade_centavos: '10000',
    stake_centavos: '0',
    valor_aposta_centavos: '10000',
    comissao_centavos: '0',
    freebet: true,
  },
  avisos: [
    {
      codigo: 'conta_ausente',
      revisao_id: '42',
      encaminhamento: 'revisar_conta',
    },
  ],
} satisfies components['schemas']['ManualCreationReceipt'];
export const casasManual = {
  dimensao: 'casas',
  data: [{ id: '7', nome: 'Betano', ativa: true }],
  pagination: { page: 1, page_size: 20, total: 1 },
} satisfies components['schemas']['OpcoesFiltro'];
export const matrizManual = {
  casa_id: 7,
  casa_nome: 'Betano',
  proxima_acao_sem_conta: 'CRIAR_CONTA',
  titulares_sem_conta: [],
  contas: [
    {
      conta_casa_id: 11,
      casa_id: 7,
      casa_nome: 'Betano',
      apelido: 'Principal',
      titular_id: 3,
      titular_nome: 'Ana',
      ativa: false,
      estado: 'ENCERRADA',
      historico_uso: [
        {
          origem: 'EXPLICITA',
          vigente_de: '2026-01-01T00:00:00Z',
          vigente_ate: '2026-10-01T00:00:00Z',
        },
      ],
      intervalo_ativo: null,
      acoes_validas: ['EDITAR'],
    },
  ],
} satisfies components['schemas']['MatrizCasaSaida'];

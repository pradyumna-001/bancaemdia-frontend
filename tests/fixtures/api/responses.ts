import type { components } from '../../../src/api/schema';

// Transport fixtures from the integrated schema; these do not establish API/session availability.
export const betsWithUnknownValues = {
  data: [
    {
      apagada: false,
      atualizada_em: null,
      casa: null,
      chat_id: null,
      chave: 'descartavel',
      competicao_id: null,
      conta_casa_id: null,
      criada_em: null,
      data_aposta: null,
      data_jogo: null,
      descricao: null,
      estado: 'PENDENTE',
      evento: null,
      freebet: false,
      lucro_centavos: null,
      mercado: null,
      mercado_id: null,
      message_id: null,
      midia_hash: null,
      odd: null,
      origem: 'manual',
      retorno_centavos: null,
      revisao_grave: false,
      stake_centavos: 100,
      stake_unidades: 1,
      time_casa_id: null,
      time_fora_id: null,
      tipster_id: null,
      valor_aposta_centavos: 100,
    },
  ],
  pagination: { page: 1, page_size: 50, total: 1 },
} satisfies components['schemas']['BetsPageResponse'];

export const acceptedUpload = {
  job_id: '6c88a930-ad3c-43b4-8a9a-bb8b6125ba52',
  status_url: '/api/v1/upload/6c88a930-ad3c-43b4-8a9a-bb8b6125ba52',
  estimated_bets: 3,
  estimated_cost_usd: 0,
  aviso: null,
} satisfies components['schemas']['UploadAcceptedResponse'];

export const partialUpload = {
  job_id: acceptedUpload.job_id,
  filename: 'descartavel.json',
  status: 'completed',
  criado_em: '2026-09-30T10:00:00Z',
  concluido_em: '2026-09-30T10:00:02Z',
  total_messages: 3,
  estimated_bets: 3,
  estimated_cost_usd: 0,
  bets_processed: 2,
  bets_failed: 1,
  cost_usd: 0,
  erro: null,
  progress: {
    read: 3,
    total: 3,
    pending: 0,
    failed: 1,
    ignored: 0,
    over_limit: 0,
    percent: 100,
  },
} satisfies components['schemas']['UploadStatusResponse'];

export const deposit = {
  conta_casa_id: 1,
  tipo: 'DEPOSITO',
  valor_centavos: 100,
  ocorrido_em: '2026-09-30T10:00:00Z',
} satisfies components['schemas']['MovimentoNovo'];

export const depositCreated = {
  tipo: 'DEPOSITO',
  transferencia_id: null,
  movimentos: [
    {
      id: 1,
      conta_casa_id: 1,
      tipo: 'DEPOSITO',
      valor_centavos: 100,
      ocorrido_em: deposit.ocorrido_em,
      descricao: null,
      transferencia_id: null,
    },
  ],
} satisfies components['schemas']['MovimentoCriadoSaida'];

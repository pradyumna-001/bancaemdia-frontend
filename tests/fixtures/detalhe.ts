import type { components } from '../../src/api/schema';
import { apostaExemplo } from './apostas';

export const detalheExemplo: components['schemas']['BetDetailResponse'] = {
  aposta: { ...apostaExemplo },
  fonte_contextual: false,
  consolidacoes: [],
  selecoes: {
    casa: apostaExemplo.casa,
    evento: apostaExemplo.evento,
    descricao: apostaExemplo.descricao,
    mercado: apostaExemplo.mercado,
  },
  eventos: [
    {
      tipo: 'APOSTA_CRIADA',
      fonte: 'telegram',
      criado_em: '2026-10-09T18:00:00Z',
      confianca: 0.9,
      payload: {
        evento: apostaExemplo.evento,
        descricao: apostaExemplo.descricao,
        odd: 2.3,
        stake_unidades: 1,
        estado: 'PENDENTE',
      },
    },
    {
      tipo: 'RESULTADO_REGISTRADO',
      fonte: 'manual',
      criado_em: '2026-10-10T22:00:00Z',
      confianca: null,
      payload: { estado: 'GREEN', retorno_centavos: 6500 },
    },
  ],
  revisao_pendente: null,
};
export const revisaoDePar: components['schemas']['RevisaoSaida'] = {
  id: 8,
  criado_em: '2026-10-10T12:00:00Z',
  resolvido_em: null,
  motivo: 'duvida_de_par',
  midia_hash: 'imagem-de-teste',
  foto_url: '/api/v1/revisao/8/foto',
  extracao_bruta: { aposta_chave: 'exemplo-1', parceira_suspeita: 'exemplo-2' },
};
export const matrizExemplo: components['schemas']['MatrizTitularSaida'] = {
  titular: {
    id: 1,
    nome: 'Ana',
    arquivado: true,
    criado_em: '2026-01-01T00:00:00Z',
  },
  contas: [
    {
      conta_casa_id: 4,
      titular_id: 1,
      titular_nome: 'Ana',
      casa_id: 7,
      casa_nome: 'Betano',
      apelido: 'Conta histórica',
      ativa: false,
      estado: 'ENCERRADA',
      acoes_validas: [],
      intervalo_ativo: null,
      historico_uso: [
        {
          origem: 'EXPLICITA',
          vigente_de: '2026-01-01T00:00:00Z',
          vigente_ate: '2026-10-10T23:00:00Z',
        },
      ],
    },
  ],
};

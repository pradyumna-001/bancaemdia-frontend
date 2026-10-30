import type { Installation } from '../../src/features/coleta/coleta';
export const temporaryCode = () => ({
  codigo: 'cpc_' + 'a'.repeat(32),
  expira_em: new Date(Date.now() + 600_000).toISOString(),
});
export const temporaryToken = 'cti_' + 'b'.repeat(43);
export const devices: Installation[] = [1, 2, 3].map((id) => ({
  id,
  instalacao_publica_id: `00000000-0000-4000-8000-00000000000${id}`,
  nome_dispositivo: [
    'Notebook pessoal',
    'Computador de casa',
    'Notebook anterior',
  ][id - 1]!,
  token_prefixo: 'cti_exemplo_',
  criado_em: '2026-10-10T12:00:00Z',
  pareado_em: '2026-10-10T12:01:00Z',
  ultimo_uso_em: id === 1 ? '2026-10-16T12:00:00Z' : null,
  rotacionado_em: null,
  revogado_em: id === 3 ? '2026-10-15T12:00:00Z' : null,
  expira_em: null,
  estado_sessao: id === 1 ? 'aberta' : id === 2 ? 'encerrada' : 'sem_sessao',
  sessao_coleta:
    id === 3
      ? null
      : {
          sessao_id: `10000000-0000-4000-8000-00000000000${id}`,
          selecao: id === 1 ? 'atual' : 'ultima_encerrada',
          coletar_desde: '2026-08-01T00:00:00.123456Z',
          criada_em: '2026-10-10T12:02:00Z',
          encerrada_em: id === 1 ? null : '2026-10-12T12:00:00Z',
        },
}));

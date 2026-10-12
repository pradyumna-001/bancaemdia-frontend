import type { components } from '../../src/api/schema';
export const titular: components['schemas']['TitularSaida'] = {
  id: 1,
  nome: 'Marina',
  arquivado: false,
  criado_em: '2026-01-01T12:00:00Z',
};
export const conta: components['schemas']['ContaMatrizSaida'] = {
  conta_casa_id: 11,
  titular_id: 1,
  titular_nome: 'Marina',
  casa_id: 7,
  casa_nome: 'Betano',
  apelido: 'Conta principal',
  estado: 'DISPONIVEL',
  ativa: false,
  intervalo_ativo: null,
  historico_uso: [],
  acoes_validas: ['ATIVAR', 'EDITAR'],
};
export const valores = {
  apostas: 24,
  pendentes: 3,
  greens: 12,
  reds: 9,
  giro_centavos: 24000,
  retorno_centavos: 28200,
  lucro_centavos: 4200,
  exposicao_aberta_centavos: 3000,
  depositos_centavos: 50000,
  saques_centavos: 10000,
  bonus_centavos: 0,
  ajustes_centavos: 0,
  roi: '0.175',
  win_rate: '0.57142857142857142857',
};
export const financeiro: components['schemas']['FinanceiroSaida'] = {
  total: valores,
  nao_atribuidas: { apostas: 2, lucro_centavos: 0 },
  nao_atribuidas_status: 'UNASSIGNED',
  saldo_atual_centavos: null,
  titulares: [
    {
      titular_id: 1,
      nome: 'Marina',
      metricas: valores,
      saldo_atual_centavos: null,
      contas: [
        {
          conta_casa_id: 11,
          titular_id: 1,
          casa_id: 7,
          casa_nome: 'Betano',
          apelido: 'Conta principal',
          metricas: valores,
          saldo_atual_centavos: null,
        },
      ],
    },
  ],
  contas_sem_titular: [
    {
      conta_casa_id: 21,
      titular_id: null,
      casa_id: 8,
      casa_nome: 'Outra casa',
      apelido: 'Conta antiga',
      metricas: { apostas: 0, lucro_centavos: 0 },
      saldo_atual_centavos: 0,
    },
  ],
};
export function createContasFixture() {
  const holders = [
    structuredClone(titular),
    { ...titular, id: 2, nome: 'Rafael' },
    { ...titular, id: 3, nome: 'Arquivo antigo', arquivado: true },
  ];
  const accounts = [
    structuredClone(conta),
    {
      ...conta,
      conta_casa_id: 12,
      casa_id: 8,
      casa_nome: 'Outra casa',
      apelido: 'Conta encerrada',
      estado: 'ENCERRADA' as const,
      acoes_validas: [],
      historico_uso: [
        {
          vigente_de: '2025-01-01T12:00:00Z',
          vigente_ate: '2025-02-01T12:00:00Z',
          origem: 'LEGADO' as const,
        },
      ],
    },
  ];
  function handle(
    method: string,
    url: URL,
    body: Record<string, unknown> = {},
  ): unknown {
    const p = url.pathname;
    if (p.startsWith('/api/v1/filtros/'))
      return {
        dimensao: p.split('/').at(-1),
        data: p.endsWith('/casas')
          ? [
              { id: '7', nome: 'Betano', ativa: true },
              { id: '8', nome: 'Outra casa', ativa: true },
            ]
          : [],
        pagination: {
          page: 1,
          page_size: 20,
          total: p.endsWith('/casas') ? 2 : 0,
        },
      };
    if (p === '/api/v1/titulares/financeiro')
      return structuredClone(financeiro);
    if (p === '/api/v1/titulares') {
      if (method === 'POST') {
        const h = {
          ...titular,
          id: holders.length + 1,
          nome: String(body.nome),
        };
        holders.push(h);
        return h;
      }
      const all = holders.filter(
        (h) =>
          (!h.arquivado ||
            url.searchParams.get('include_archived') === 'true') &&
          h.nome
            .toLowerCase()
            .includes((url.searchParams.get('search') ?? '').toLowerCase()),
      );
      const page = Number(url.searchParams.get('page') ?? 1);
      return {
        data: all.slice((page - 1) * 50, page * 50),
        page,
        page_size: 50,
        total: all.length,
      };
    }
    const house = /\/casas\/(\d+)\/matriz$/.exec(p);
    if (house)
      return {
        casa_id: Number(house[1]),
        casa_nome: Number(house[1]) === 7 ? 'Betano' : 'Outra casa',
        contas: accounts.filter((a) => a.casa_id === Number(house[1])),
        titulares_sem_conta: holders.filter((h) => h.id === 2),
        proxima_acao_sem_conta: 'CRIAR_CONTA',
      };
    const match =
      /\/titulares\/(\d+)(?:\/contas(?:\/(\d+))?(\/ativar)?)?(\/matriz)?$/.exec(
        p,
      );
    if (!match) return undefined;
    const holder = holders.find((h) => h.id === Number(match[1]));
    if (!holder) return undefined;
    if (match[4])
      return {
        titular: holder,
        contas: accounts.filter((a) => a.titular_id === holder.id),
      };
    if (p.endsWith('/contas') && method === 'POST') {
      const a = {
        ...conta,
        conta_casa_id: 100 + accounts.length,
        titular_id: holder.id,
        titular_nome: holder.nome,
        apelido: String(body.apelido),
        casa_id: Number(body.casa_id),
        casa_nome: Number(body.casa_id) === 7 ? 'Betano' : 'Outra casa',
      };
      accounts.push(a);
      return a;
    }
    if (match[2]) {
      const a = accounts.find((a) => a.conta_casa_id === Number(match[2]));
      if (!a) return undefined;
      if (match[3]) {
        a.estado = 'EM_USO';
        a.ativa = true;
        a.acoes_validas = ['TROCAR_DE'];
        a.intervalo_ativo = {
          vigente_de: '2026-10-11T12:00:00Z',
          vigente_ate: null,
          origem: 'EXPLICITA',
        };
        a.historico_uso = [a.intervalo_ativo];
      } else {
        if (body.apelido) a.apelido = String(body.apelido);
        if (body.estado) a.estado = body.estado as typeof a.estado;
      }
      return a;
    }
    if (method === 'PATCH') holder.nome = String(body.nome);
    if (method === 'DELETE') holder.arquivado = true;
    return holder;
  }
  return { handle, holders, accounts };
}

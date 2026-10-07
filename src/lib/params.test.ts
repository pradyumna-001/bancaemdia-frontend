import { expect, it } from 'vitest';
import {
  lerFiltros,
  adaptarFiltros,
  alterarFiltro,
  trocarPagina,
} from './params';
const read = (query: string) => lerFiltros(new URLSearchParams(query));
it('mapeia somente capacidades publicadas da lista, sem cursor nem dimensões futuras', () => {
  const visao = read(
    'casa=002&tipster=3&mercado=4&competicao=5&estado=GREEN&origem=telegram&revisao=0&apagadas=todas&page=2&page_size=10&titular=6&conta=7&grupo=8&banca=9&cursor=PRIVATE',
  );
  const result = adaptarFiltros(visao, 'apostas');
  expect(result.apostas).toMatchObject({
    casa_id: 2,
    tipster_id: 3,
    mercado_id: 4,
    competicao_id: 5,
    estado: 'GREEN',
    origem: 'telegram',
    revisao_grave: false,
    incluir_apagadas: true,
    page: 2,
    page_size: 10,
  });
  expect(result.preservados).toEqual(['titular', 'conta', 'grupo', 'banca']);
  expect(result.apostas).not.toHaveProperty('cursor');
  expect(result.apostas).not.toHaveProperty('titular_id');
  expect(new URLSearchParams(visao.busca).get('cursor')).toBe('PRIVATE');
  expect(result.painel).toBeUndefined();
});
it.each(['painel', 'metricas', 'export'] as const)(
  'declara população de %s, preservando dimensões sem aplicar',
  (resource) => {
    const result = adaptarFiltros(
      read(
        'casa=2&tipster=3&mercado=4&estado=RED&origem=manual&desde=2026-10-01&ate=2026-10-04&apagadas=1&revisao=1&competicao=5&grupo=6&periodo=90d',
      ),
      resource,
    );
    expect(result.painel).toEqual({
      casa_id: 2,
      tipster_id: 3,
      mercado_id: 4,
      periodo: '90d',
    });
    expect(result.apostas).toBeUndefined();
    expect(result.bloqueios).toEqual([]);
    expect(result.preservados).toEqual(
      expect.arrayContaining([
        'estado',
        'origem',
        'desde',
        'ate',
        'apagadas',
        'revisao',
        'grupo',
        'competicao',
      ]),
    );
    expect(result.escopo).toContain('diferente');
  },
);
it('apagadas=1 bloqueia GET em vez de incluir ativas ou filtrar a página local', () => {
  const visao = read('apagadas=1&estado=GREEN&page=4');
  expect(adaptarFiltros(visao, 'apostas').apostas).toBeUndefined();
  expect(adaptarFiltros(visao, 'apostas').bloqueios[0]).toContain(
    'somente apagadas',
  );
  expect(visao.valores).toEqual({ apagadas: '1', estado: 'GREEN' });
  expect(visao.page).toBe(4);
});
it.each(['', 'apagadas=0'])(
  'ativa padrão e não inventa revisão/percentual/dimensões em %s',
  (query) => {
    expect(adaptarFiltros(read(query), 'apostas').apostas).toMatchObject({
      incluir_apagadas: false,
      page: 1,
      page_size: 50,
      revisao_grave: undefined,
    });
    expect(adaptarFiltros(read(query), 'painel').painel?.periodo).toBe('30d');
  },
);
it('preserva intervalo civil com final inclusivo e limite API exclusivo', () => {
  expect(
    adaptarFiltros(read('desde=2018-11-04&ate=2018-11-04&revisao=1'), 'apostas')
      .apostas,
  ).toMatchObject({
    desde: '2018-11-04T03:00:00.000Z',
    ate: '2018-11-05T02:00:00.000Z',
    revisao_grave: true,
  });
});
it('range invertido e último dia do calendário bloqueiam sem apagar datas válidas', () => {
  for (const query of ['desde=2026-10-06&ate=2026-10-01', 'ate=9999-12-31']) {
    const visao = read(query);
    expect(visao.busca).toBe(query);
    expect(adaptarFiltros(visao, 'apostas').apostas).toBeUndefined();
    expect(adaptarFiltros(visao, 'apostas').bloqueios).toHaveLength(1);
    expect(adaptarFiltros(visao, 'painel').painel).toBeDefined();
  }
});
it.each([
  'casa=0',
  'conta=-1',
  'titular=1.2',
  'banca=1e2',
  'grupo=x',
  'tipster=1&tipster=2',
  'mercado=',
  'competicao=Infinity',
  'estado=toString',
  'estado=green',
  'origem=%00',
  'origem=%7F',
  'origem=',
  'desde=2026-02-30',
  'ate=undefined',
  'apagadas=true',
  'revisao=2',
  'periodo=365d',
  'page=NaN',
  'page=1&page=1',
  'page=9007199254740992',
  'page_size=101',
  'page_size=0',
])('normaliza sintaxe inválida sem remover o filtro válido: %s', (bad) => {
  const visao = read('casa=44&banca=8&extra=manter&' + bad);
  expect(visao.invalidos.length).toBeGreaterThan(0);
  expect(
    visao.valores.banca ??
      (bad.startsWith('banca=') ? 'invalidado' : undefined),
  ).toBeDefined();
  expect(new URLSearchParams(visao.busca).get('extra')).toBe('manter');
  expect(lerFiltros(new URLSearchParams(visao.busca)).invalidos).toEqual([]);
  expect(() => adaptarFiltros(visao, 'apostas')).not.toThrow();
});
it('alterações e remoções são explícitas, resetam apenas página e preservam contexto desconhecido', () => {
  const search = new URLSearchParams(
    'casa=4&grupo=3&page=99&page_size=25&extra=keep&apagadas=1',
  );
  const next = alterarFiltro(search, 'estado', 'RED');
  expect(next.get('page')).toBeNull();
  expect(next.get('page_size')).toBe('25');
  expect(next.get('apagadas')).toBe('1');
  expect(next.get('grupo')).toBe('3');
  expect(next.get('extra')).toBe('keep');
  expect(search.get('estado')).toBeNull();
  expect(alterarFiltro(next, 'grupo').has('grupo')).toBe(false);
  expect(alterarFiltro(next, 'casa', '-1').has('casa')).toBe(false);
  expect(trocarPagina(next, 3).get('page')).toBe('3');
  expect(trocarPagina(next, NaN).get('page')).toBe('1');
});
it('origem textual válida permanece literal, inclusive Unicode e pontuação, sem seguir URL', () => {
  const result = adaptarFiltros(
    read('origem=' + encodeURIComponent('Canal / São Paulo')),
    'apostas',
  );
  expect(result.apostas?.origem).toBe('Canal / São Paulo');
});
it('ID inteiro maior que precisão JS permanece exato; não consulta outro ID nem elimina o filtro', () => {
  const visao = read('casa=09007199254740993&titular=9007199254740993');
  expect(visao.valores.casa).toBe('9007199254740993');
  expect(visao.invalidos).toEqual([]);
  for (const resource of ['apostas', 'painel'] as const) {
    const adapter = adaptarFiltros(visao, resource);
    expect(adapter.apostas).toBeUndefined();
    expect(adapter.painel).toBeUndefined();
    expect(adapter.bloqueios).toHaveLength(1);
  }
  const future = read('titular=9007199254740993');
  expect(adaptarFiltros(future, 'apostas').bloqueios).toEqual([]);
  expect(adaptarFiltros(future, 'apostas').preservados).toContain('titular');
});

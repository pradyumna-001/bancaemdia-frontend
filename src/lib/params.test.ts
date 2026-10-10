import { expect, it } from 'vitest';
import { SITE_READ_CONTRACT } from '../api/site-read.generated';
import { serializarConsulta } from './params';
import {
  lerFiltros,
  adaptarFiltros as adaptar,
  alterarFiltro,
  trocarPagina,
} from './params';
import { FILTER_READ_CONTRACT } from '../../tests/fixtures/apostas-contract.generated';
import type { VisaoFiltros, RecursoFiltros } from './params';
const adaptarFiltros = (view: VisaoFiltros, resource: RecursoFiltros) =>
  adaptar(view, resource, FILTER_READ_CONTRACT);
const read = (query: string) => lerFiltros(new URLSearchParams(query));
it('candidato da projeção nunca promete filtro ausente, somente apagadas ou ID impreciso', () => {
  for (const query of [
    'grupo=4',
    'banca=8',
    'apagadas=1',
    'casa=9007199254740993',
    'periodo=30d',
  ]) {
    const view = read(query);
    const result = adaptar(view, 'apostas', SITE_READ_CONTRACT);
    expect(result.bloqueios.length).toBeGreaterThan(0);
    expect(view.busca).toBe(query);
  }
  expect(
    adaptar(
      read('periodo=all&apagadas=todas&casa=2'),
      'apostas',
      SITE_READ_CONTRACT,
    ).query,
  ).toMatchObject({ incluir_apagadas: true, casa_id: '2' });
  expect(
    adaptar(read('apagadas=0'), 'apostas', SITE_READ_CONTRACT).bloqueios,
  ).toEqual([]);
  expect(
    adaptar(read(''), 'painel', SITE_READ_CONTRACT).bloqueios,
  ).toHaveLength(1);
  expect(
    serializarConsulta({
      casa_id: '9007199254740993',
      incluir_apagadas: false,
      origem: 'São Paulo / A',
    }),
  ).toBe(
    'casa_id=9007199254740993&incluir_apagadas=false&origem=S%C3%A3o+Paulo+%2F+A',
  );
});
it.each(['apostas', 'painel', 'metricas', 'export'] as const)(
  'aplica a matriz completa e IDs exatos em %s sem repassar contexto arbitrário',
  (resource) => {
    const visao = read(
      'casa=002&tipster=3&mercado=4&competicao=5&estado=GREEN&origem=telegram&revisao=0&apagadas=todas&page=2&page_size=10&titular=6&conta=7&grupo=8&banca=9007199254740993&cursor=PRIVATE',
    );
    const result = adaptarFiltros(visao, resource);
    const query = result.query;
    expect(query).toMatchObject({
      casa_id: '2',
      tipster_id: '3',
      mercado_id: '4',
      competicao_id: '5',
      estado: 'GREEN',
      origem: 'telegram',
      revisao_grave: false,
      visibilidade: 'todas',
      titular_id: '6',
      conta_casa_id: '7',
      grupo_id: '8',
      banca_id: '9007199254740993',
    });
    expect(result.preservados).toEqual([]);
    expect(result.bloqueios).toEqual([]);
    expect(query).not.toHaveProperty('incluir_apagadas');
    expect(query).not.toHaveProperty('cursor');
    expect(new URLSearchParams(visao.busca).get('cursor')).toBe('PRIVATE');
    if (resource === 'apostas')
      expect(query).toMatchObject({ page: 2, page_size: 10 });
    else {
      expect(query).not.toHaveProperty('page');
      expect(result.endpoint).toContain('/painel/filtrado');
    }
  },
);
it.each([
  ['', 'ativas'],
  ['apagadas=0', 'ativas'],
  ['apagadas=1', 'apagadas'],
  ['apagadas=todas', 'todas'],
])(
  'traduz %s sem misturar bool legado com visibilidade',
  (query, visibility) => {
    for (const resource of [
      'apostas',
      'painel',
      'metricas',
      'export',
    ] as const) {
      const adapter = adaptarFiltros(read(query), resource);
      expect(adapter.query).toMatchObject({
        visibilidade: visibility,
      });
      expect(adapter.bloqueios).toEqual([]);
    }
  },
);
it.each(['apostas', 'painel', 'metricas', 'export'] as const)(
  'período e intervalo válidos conflitantes bloqueiam %s sem apagar contexto',
  (resource) => {
    const visao = read('periodo=7d&desde=2026-10-01&ate=2026-10-02');
    const result = adaptarFiltros(visao, resource);
    expect(result.bloqueios.length).toBeGreaterThan(0);
    expect(result.bloqueios[0]).toContain('Escolha um período ou datas');
    expect(visao.valores).toEqual({
      periodo: '7d',
      desde: '2026-10-01',
      ate: '2026-10-02',
    });
    const next = alterarFiltro(new URLSearchParams(visao.busca), 'periodo');
    expect(adaptarFiltros(lerFiltros(next), resource).bloqueios).toEqual([]);
  },
);
it('período publicado é preservado e aplicado também na lista', () => {
  expect(adaptarFiltros(read('periodo=90d'), 'apostas').query.periodo).toBe(
    '90d',
  );
});
it('preserva intervalo civil com final inclusivo e limite API exclusivo', () => {
  expect(
    adaptarFiltros(read('desde=2018-11-04&ate=2018-11-04&revisao=1'), 'apostas')
      .query,
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
    expect(adaptarFiltros(visao, 'apostas').bloqueios.length).toBeGreaterThan(
      0,
    );
    expect(adaptarFiltros(visao, 'apostas').bloqueios).toHaveLength(1);
    expect(adaptarFiltros(visao, 'painel').bloqueios.length).toBeGreaterThan(0);
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
  'casa=9223372036854775808',
  'origem=' + 'x'.repeat(129),
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
  expect(result.query.origem).toBe('Canal / São Paulo');
});
it('BIGINT maior que precisão JS permanece texto e o máximo positivo é aplicado sem arredondar', () => {
  const visao = read('casa=09007199254740993&titular=9223372036854775807');
  expect(visao.valores.casa).toBe('9007199254740993');
  expect(visao.invalidos).toEqual([]);
  for (const resource of ['apostas', 'painel'] as const) {
    const result = adaptarFiltros(visao, resource);
    expect(result.bloqueios).toEqual([]);
    expect(result.query).toMatchObject({
      casa_id: '9007199254740993',
      titular_id: '9223372036854775807',
    });
  }
});

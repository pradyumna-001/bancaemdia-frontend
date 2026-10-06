import { expect, it } from 'vitest';
import { errorContext } from './errorContext';

it.each([
  ['/aposta/ausente', '/', 'Apostas'],
  ['/painel/analises', '/painel', 'Painel'],
  ['/painel/nova-rota', '/painel', 'Painel'],
  ['/contas/42', '/contas', 'Contas e titulares'],
  ['/coleta/ausente', '/coleta', 'Coleta'],
  ['/banca/ausente', '/banca', 'Caixa'],
  ['/configuracoes/privacidade', '/configuracoes', 'Configurações'],
  ['/calculadoras', '/calculadoras', 'Calculadoras'],
  ['/assinatura', '/assinatura', 'Assinatura'],
  ['/resultados', '/resultados', 'Resultados'],
  ['/revisao', '/revisao', 'Revisão'],
  ['/enviar', '/enviar', 'Enviar'],
  ['/painel-alheio', '/', 'Apostas'],
  ['//fora.example/painel', '/', 'Apostas'],
])(
  'retorno de %s segue catálogo e conserva filtros/seção',
  (path, target, title) => {
    expect(
      errorContext(path!, '?apagadas=1&estado=GREEN&casa=Bet%20365', '#serie'),
    ).toEqual({
      label: `Voltar para ${title}`,
      to: `${target}?apagadas=1&estado=GREEN&casa=Bet%20365#serie`,
      helpTo: '/tutorial?apagadas=1&estado=GREEN&casa=Bet%20365#serie',
    });
  },
);

it.each([
  '/login',
  '/criar-conta',
  '/confirmar-email',
  '/esqueci-senha/antigo',
  '/senha',
  '/sair',
])('retorno de conta %s valida destino interno', (path) => {
  const { label, to } = errorContext(
    path,
    '?destino=%2Fpainel%3Fapagadas%3D1%26code%3DSIGILO%23serie&state=SIGILO',
    '#access_token=SIGILO',
  );
  expect(label).toBe('Voltar para entrar');
  expect(new URL(to, 'https://site.example').searchParams.get('destino')).toBe(
    '/painel?apagadas=1#serie',
  );
  expect(to).not.toContain('SIGILO');
});

it('não leva destino externo/protocolo para links de retorno', () => {
  const { to } = errorContext(
    '/painel/ausente',
    '?destino=https%3A%2F%2Ffora.example&code=SIGILO&state=SIGILO&apagadas=1',
    '#id_token=SIGILO',
  );
  expect(to).toBe('/painel?apagadas=1');
  expect(
    new URL(
      errorContext('/login', '?destino=%2F%2Ffora.example', '').to,
      'https://site.example',
    ).searchParams.get('destino'),
  ).toBe('/');
});

it('conta sem destino preserva filtros no retorno padrão, sem promover URL desconhecida', () => {
  const { to } = errorContext('/criar-conta/ausente', '?apagadas=1', '#lista');
  expect(new URL(to, 'https://site.example').searchParams.get('destino')).toBe(
    '/?apagadas=1#lista',
  );
});

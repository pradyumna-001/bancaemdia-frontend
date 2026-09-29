// @vitest-environment node
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { expect, it } from 'vitest';
const script = readFileSync(
  new URL('../../src/styles/tema-inicial.js', import.meta.url),
  'utf8',
);
function iniciar({ valor = null, escuro = false, bloqueado = false } = {}) {
  const eventos = {};
  const media = {
    matches: escuro,
    addEventListener: (_, fn) => {
      eventos.sistema = fn;
    },
  };
  const storage = {
    getItem() {
      if (bloqueado) throw new Error('Bloqueado');
      return valor;
    },
    setItem(_, novo) {
      if (bloqueado) throw new Error('Bloqueado');
      valor = novo;
    },
  };
  const window = {
    localStorage: storage,
    matchMedia: () => media,
    addEventListener: (tipo, fn) => {
      eventos[tipo] = fn;
    },
  };
  const document = { documentElement: { dataset: {} } };
  runInNewContext(script, { window, document });
  return {
    tema: window.bancaemdiaTema,
    raiz: document.documentElement,
    storage,
    eventos,
    media,
    salvo: () => valor,
  };
}
it.each([
  [null, false, 'claro'],
  [null, true, 'escuro'],
  ['invalido', true, 'escuro'],
  ['claro', true, 'claro'],
  ['escuro', false, 'escuro'],
])('resolve preferência %s antes da aplicação', (valor, escuro, esperado) => {
  expect(iniciar({ valor, escuro }).raiz.dataset.tema).toBe(esperado);
});
it('acompanha o sistema somente quando a preferência é sistema', () => {
  const app = iniciar();
  app.media.matches = true;
  app.eventos.sistema();
  expect(app.raiz.dataset.tema).toBe('escuro');
  app.tema.definir('claro');
  app.eventos.sistema();
  expect(app.raiz.dataset.tema).toBe('claro');
  app.tema.definir('sistema');
  expect(app.raiz.dataset.tema).toBe('escuro');
});
it('persiste, notifica, cancela assinatura e sincroniza armazenamento de outra aba', () => {
  const app = iniciar();
  let avisos = 0;
  const sair = app.tema.assinar(() => avisos++);
  app.tema.definir('escuro');
  expect(app.salvo()).toBe('escuro');
  expect(avisos).toBe(1);
  sair();
  app.eventos.storage({
    key: 'bancaemdia.tema',
    newValue: 'claro',
    storageArea: app.storage,
  });
  expect(app.tema.ler()).toBe('claro');
  expect(app.raiz.dataset.tema).toBe('claro');
  expect(avisos).toBe(1);
  app.eventos.storage({
    key: 'bancaemdia.tema',
    newValue: 'escuro',
    storageArea: {},
  });
  expect(app.tema.ler()).toBe('claro');
  app.eventos.storage({ key: null, newValue: null, storageArea: app.storage });
  expect(app.tema.ler()).toBe('sistema');
});
it('continua utilizável com leitura e escrita de storage bloqueadas', () => {
  const app = iniciar({ bloqueado: true, escuro: true });
  expect(app.raiz.dataset.tema).toBe('escuro');
  app.tema.definir('claro');
  expect(app.raiz.dataset.tema).toBe('claro');
});
it('normaliza preferência corrompida recebida por outra aba', () => {
  const app = iniciar({ valor: 'escuro' });
  app.eventos.storage({
    key: 'bancaemdia.tema',
    newValue: 'corrompido',
    storageArea: app.storage,
  });
  expect(app.tema.ler()).toBe('sistema');
  expect(app.raiz.dataset.tema).toBe('claro');
});

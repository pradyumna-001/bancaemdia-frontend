import { expect, it } from 'vitest';
import {
  devices,
  temporaryCode,
  temporaryToken,
} from '../../../tests/fixtures/coleta';
import {
  installations,
  pairing,
  rotated,
  credential,
  maskedPrefix,
  coletaDate,
} from './coleta';
it('valida a projeção completa sem sintetizar fronteiras ou presença', () => {
  expect(installations(devices)).toBe(devices);
  expect(installations([])).toEqual([]);
  expect(() => installations(undefined)).toThrow();
  const corruptions = [
    null,
    { ...devices[0], id: 0 },
    { ...devices[0], criado_em: 'inválido' },
    { ...devices[0], nome_dispositivo: 4 },
    { ...devices[0], estado_sessao: 'sem_sessao' },
    { ...devices[0], sessao_coleta: null },
    {
      ...devices[0],
      sessao_coleta: {
        ...devices[0]!.sessao_coleta,
        selecao: 'ultima_encerrada',
      },
    },
    {
      ...devices[1],
      sessao_coleta: { ...devices[1]!.sessao_coleta, encerrada_em: null },
    },
    { ...devices[0], estado_sessao: 'online' },
  ];
  for (const row of corruptions)
    expect(() => installations([row] as typeof devices)).toThrow();
  expect(() => installations([devices[0]!, devices[0]!])).toThrow();
});
it('segredos têm validação de formato, identidade e data sem guardar respostas', () => {
  expect(pairing(temporaryCode()).codigo).toMatch(/^cpc_/);
  for (const value of [
    undefined,
    { codigo: 'segredo', expira_em: '2030-01-01' },
    { codigo: temporaryCode().codigo, expira_em: 'inválido' },
  ])
    expect(() => pairing(value)).toThrow();
  expect(rotated({ instalacao_id: 1, token: temporaryToken }, 1)).toBe(
    temporaryToken,
  );
  for (const value of [
    undefined,
    { instalacao_id: 2, token: temporaryToken },
    { instalacao_id: 1, token: 'inválido' },
  ])
    expect(() => rotated(value, 1)).toThrow();
});
it('credencial e sessão são independentes; prefixo permanece mascarado', () => {
  expect(credential(devices[0]!)).toBe('Sem revogação registrada');
  expect(credential(devices[2]!)).toBe('Revogada');
  expect(
    credential({ ...devices[0]!, expira_em: '2020-01-01T00:00:00Z' }),
  ).toBe('Expirada');
  expect(
    credential({ ...devices[0]!, expira_em: '2099-01-01T00:00:00Z' }),
  ).toBe('Sem revogação registrada');
  expect(maskedPrefix(temporaryToken)).toBe(
    temporaryToken.slice(0, 12) + '••••',
  );
  expect(maskedPrefix(null)).toBe('Não informado');
  expect(coletaDate(null)).toBe('Não informado');
  expect(coletaDate(devices[0]!.criado_em)).toContain('2026');
});

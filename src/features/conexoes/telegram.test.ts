import { expect, it } from 'vitest';
import { ApiError } from '../../api/error';
import {
  unlinkedTelegram,
  linkedTelegram,
  temporaryTelegramCode,
} from '../../../tests/fixtures/telegram';
import { linkCode, linkStatus, pollDelay, telegramDate } from './telegram';
it('aceita apenas o contrato publicado e conserva null, sem presença online', () => {
  expect(linkStatus(unlinkedTelegram)).toEqual(unlinkedTelegram);
  expect(linkStatus(linkedTelegram)).toEqual(linkedTelegram);
  expect(telegramDate(null)).toBe('Não informado');
  expect(telegramDate(linkedTelegram.linked_at)).toContain('America/Sao_Paulo');
  expect(linkCode(temporaryTelegramCode()).code).toBe('ABCDEFGH');
});
it.each([
  undefined,
  { ...unlinkedTelegram, linked: 'false' },
  { ...unlinkedTelegram, linked_at: '2026-10-08T12:00:00Z' },
  { ...linkedTelegram, linked_at: null },
  { ...linkedTelegram, last_outbound_at: 5 },
  { ...linkedTelegram, last_inbound_at: 'bad' },
])('recusa estado incoerente sem expor payload: %j', (value) =>
  expect(() => linkStatus(value as unknown as typeof unlinkedTelegram)).toThrow(
    ApiError,
  ),
);
it.each([
  undefined,
  { code: 'SECRET', expires_at: '2026-10-08T12:00:00Z' },
  { code: 'ABCDEFGH', expires_at: 'bad' },
  { code: 'ABCDEFGH', expires_at: null },
  { code: 56, expires_at: '2026-10-08T12:00:00Z' },
])('código inválido é emissão com resultado desconhecido: %j', (value) => {
  try {
    linkCode(value as ReturnType<typeof temporaryTelegramCode>);
    throw Error('expected invalid');
  } catch (error) {
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).outcomeUnknown).toBe(true);
  }
});
it('limita polling a dois minutos com intervalos crescentes', () => {
  expect(pollDelay(100, 100)).toBe(5000);
  expect(pollDelay(100, 30100)).toBe(10000);
  expect(pollDelay(100, 120100)).toBe(false);
  expect(pollDelay(100, 150100)).toBe(false);
});

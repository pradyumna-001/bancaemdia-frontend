import { expect, it } from 'vitest';
import { exigirSessao, semSessao } from './guard';
it('guard sem integração nunca fabrica uma sessão e exige true explícito', async () => {
  expect(await exigirSessao(semSessao)()).toBe(false);
  expect(await exigirSessao(async () => true)()).toBe(true);
  expect(await exigirSessao(() => false)()).toBe(false);
});

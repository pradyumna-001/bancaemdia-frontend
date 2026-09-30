// Ponto de integração do provedor futuro; não armazena nem fabrica tokens.
export type ConsultarSessao = () => boolean | Promise<boolean>;
export const semSessao: ConsultarSessao = () => false;

export function exigirSessao(consultarSessao: ConsultarSessao) {
  return async () => (await consultarSessao()) === true;
}

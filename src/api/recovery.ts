import { ApiError } from './error';

export type ErrorIntent = 'leitura' | 'gravacao';
export type ConflictContext = 'estado' | 'idempotencia' | 'previa';
export type RecoveryAction =
  | 'entrar'
  | 'assinatura'
  | 'conferir'
  | 'recarregar'
  | 'previa'
  | 'revisar'
  | 'tentar';

// Context is supplied by the consuming operation, never inferred from raw server text.
export function recuperacaoErro(
  error: unknown,
  intent: ErrorIntent,
  conflict?: ConflictContext,
) {
  const safe =
    error instanceof ApiError
      ? error
      : new ApiError('invalid_response', { mutation: intent === 'gravacao' });
  const result = (
    title: string,
    description: string,
    action?: RecoveryAction,
  ) => ({ title, description, action, error: safe });
  if (safe.status === 401)
    return result(
      'Entre novamente para continuar',
      'Seu pedido não será reenviado. Mantenha esta página aberta para preservar o que preencheu.',
      'entrar',
    );
  if (safe.status === 402)
    return result(
      'Sua conta está em modo de leitura',
      'Você pode consultar e exportar seus dados. O formulário foi preservado; conferir a assinatura não reenvia este pedido.',
      'assinatura',
    );
  if (safe.status === 409) {
    if (conflict === 'estado')
      return result(
        'O estado não permite esta ação',
        'Confira o estado atual antes de decidir o próximo passo. O que você preencheu foi preservado.',
        'recarregar',
      );
    if (conflict === 'previa')
      return result(
        'A prévia precisa ser refeita',
        'Confira uma nova prévia antes de confirmar. O pedido não foi reenviado.',
        'previa',
      );
    if (conflict === 'idempotencia')
      return result(
        'Confira o pedido já enviado',
        'Uma chave já utilizada não deve receber outro corpo. Confira o resultado antes de iniciar uma nova intenção.',
        'conferir',
      );
    return result(
      'Este pedido precisa de revisão',
      'Há um conflito no pedido ou no recurso. Confira o resultado antes de decidir como continuar; recarregar pode não resolver.',
      intent === 'gravacao' ? 'conferir' : 'revisar',
    );
  }
  if (safe.outcomeUnknown)
    return result(
      'Confira se o pedido foi concluído',
      'A espera terminou, mas o serviço pode ter recebido o pedido. Confira o resultado antes de repetir. Sua entrada foi preservada.',
      'conferir',
    );
  if (safe.status === 413)
    return result(
      'O arquivo ultrapassa o limite',
      'Reduza o arquivo ou escolha um menor antes de enviar. O restante do formulário foi preservado.',
      'revisar',
    );
  if (safe.status === 422 || safe.status === 400)
    return result(
      'Confira os dados do pedido',
      intent === 'leitura'
        ? 'Os filtros foram preservados. Revise os critérios; uma recusa do serviço não remove um filtro válido.'
        : 'Revise os campos indicados e confirme novamente quando estiver pronto. Nenhum valor foi apagado.',
      'revisar',
    );
  if (safe.status === 403 || safe.status === 404 || safe.status === 405)
    return result('Este recurso não está disponível', safe.message);
  if (safe.kind === 'cancelled')
    return result(
      'A espera foi interrompida',
      'Você pode voltar a consultar quando quiser. Isso não cancela processamento remoto.',
      intent === 'leitura' ? 'tentar' : undefined,
    );
  return result(
    safe.status === 429
      ? 'Aguarde para tentar novamente'
      : safe.status === 503
        ? 'O serviço está temporariamente indisponível'
        : 'Não foi possível concluir o pedido',
    safe.message,
    intent === 'leitura' ? 'tentar' : 'revisar',
  );
}

export const ACTION_LABELS: Record<RecoveryAction, string> = {
  entrar: 'Entrar novamente',
  assinatura: 'Ver assinatura',
  conferir: 'Conferir resultado',
  recarregar: 'Consultar estado atual',
  previa: 'Refazer prévia',
  revisar: 'Revisar pedido',
  tentar: 'Tentar novamente',
};

import { useEffect, useId, useRef } from 'react';
import { destinoInterno } from '../auth/destinoInterno';
import {
  ACTION_LABELS,
  recuperacaoErro,
  type ConflictContext,
  type ErrorIntent,
  type RecoveryAction,
} from '../api/recovery';
import './ErroApi.css';
import { useRetryAfter } from '../lib/useRetryAfter';

export type ErrorField = Readonly<{
  scope: 'body' | 'query';
  field: string;
  id: string;
  label: string;
}>;

export function ErroApi({
  error,
  intent,
  conflict,
  destination = '/',
  fields = [],
  actions = {},
}: {
  error: unknown;
  intent: ErrorIntent;
  conflict?: ConflictContext;
  destination?: string;
  fields?: readonly ErrorField[];
  actions?: Partial<Record<RecoveryAction, () => void>>;
}) {
  const model = recuperacaoErro(error, intent, conflict);
  const id = useId();
  const region = useRef<HTMLElement>(null);
  const signature = `${model.title}:${model.description}`;
  // Re-renders/polling of the same error don't steal focus or repeat announcements.
  useEffect(() => {
    region.current?.focus();
  }, [signature]);
  const waiting = useRetryAfter(error);
  const mapped = fields.filter((field) =>
    model.error.invalidFields.some(
      (issue) => issue.scope === field.scope && issue.field === field.field,
    ),
  );
  const focusField = (field: ErrorField) =>
    document.getElementById(field.id)?.focus();
  const action = model.action;
  const callback =
    action &&
    (actions[action] ??
      (action === 'revisar' && mapped.length
        ? () => focusField(mapped[0]!)
        : undefined));
  const destinationSafe = destinoInterno(destination);
  return (
    <section
      ref={region}
      tabIndex={-1}
      className="erro-api"
      aria-labelledby={`${id}-titulo`}
      aria-describedby={`${id}-mensagem`}
    >
      <h2 id={`${id}-titulo`}>{model.title}</h2>
      <p id={`${id}-mensagem`} role="alert">
        {model.description}
      </p>
      {mapped.length > 0 && (
        <ul aria-label="Campos que precisam de revisão">
          {mapped.map((field) => (
            <li key={`${field.scope}:${field.field}`}>
              <button type="button" onClick={() => focusField(field)}>
                Confira {field.label}
              </button>
            </li>
          ))}
        </ul>
      )}
      {waiting && model.action === 'tentar' && (
        <p className="erro-api-espera">
          Aguarde o prazo informado pelo serviço antes de tentar novamente.
        </p>
      )}
      <div className="acoes">
        {callback && action && (
          <button
            type="button"
            disabled={waiting && action === 'tentar'}
            onClick={callback}
          >
            {ACTION_LABELS[action]}
          </button>
        )}
        {!callback && action === 'entrar' && (
          <a
            href={`/login?destino=${encodeURIComponent(destinationSafe)}`}
            target="_blank"
            rel="noopener"
          >
            Entrar novamente{' '}
            <span className="erro-api-contexto">(em outra aba)</span>
          </a>
        )}
        {!callback && action === 'assinatura' && (
          <a
            href={`/assinatura${destinationSafe.includes('?') ? destinationSafe.slice(destinationSafe.indexOf('?')).split('#')[0] : ''}`}
            target="_blank"
            rel="noopener"
          >
            Ver assinatura{' '}
            <span className="erro-api-contexto">(em outra aba)</span>
          </a>
        )}
        {actions.revisar && action !== 'revisar' && (
          <button type="button" onClick={actions.revisar}>
            {intent === 'leitura' ? 'Revisar filtros' : 'Voltar ao formulário'}
          </button>
        )}
      </div>
    </section>
  );
}

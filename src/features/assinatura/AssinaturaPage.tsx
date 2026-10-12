import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAcesso } from '../acesso/ProvedorAcesso';
import { useAuth } from '../../auth/ProvedorAuth';
import {
  getApiClient,
  createIdempotencyKey,
  type createApiClient,
} from '../../api/client';
import { ApiError } from '../../api/error';
import { ErroApi } from '../../components/ErroApi';
import { dataHora, precoAssinatura } from '../../lib/format';
import { useRetryAfter } from '../../lib/useRetryAfter';
import {
  hostedUrl,
  offersCancel,
  offersCheckout,
  STATUS_LABELS,
  type Price,
  type Subscribe,
} from './protocol';
import { clearBillingReturn, rememberBillingReturn } from './returnDestination';
import './assinatura.css';

function sessionStorageSafe(): Storage | undefined {
  try {
    return window.sessionStorage;
  } catch {
    return undefined;
  }
}

export function AssinaturaPage({
  returning = false,
  onReturnHandled,
  client,
  go = (url) => location.assign(url),
}: {
  returning?: boolean | (() => boolean);
  onReturnHandled?: () => void;
  client?: ReturnType<typeof createApiClient>;
  go?: (url: string) => void;
}) {
  const access = useAcesso();
  const auth = useAuth();
  const route = useLocation();
  const [selected, setSelected] = useState<number>();
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState<unknown>();
  const [message, setMessage] = useState('');
  const [uncertainActions, setUncertainActions] = useState<ReadonlySet<string>>(
    new Set(),
  );
  const [intentLocked, setIntentLocked] = useState(false);
  const [wasReturning] = useState(() =>
    typeof returning === 'function' ? returning() : returning,
  );
  const [returningNow, setReturningNow] = useState(wasReturning);
  const intent = useRef<{ body: Subscribe; key: string }>();
  const acting = useRef(false);
  const alive = useRef(true);
  const accessRef = useRef(access);
  useEffect(() => {
    accessRef.current = access;
  }, [access]);
  const waiting = useRetryAfter(error);
  const status = access?.status;
  const blocked =
    busy || waiting || !status || access?.checking || access?.waiting;
  const cancelButton = useRef<HTMLButtonElement>(null);
  const confirmation = useRef<HTMLButtonElement>(null);
  const title = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  useEffect(() => {
    if (!wasReturning) return;
    onReturnHandled?.();
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    let attempts = 0;
    const check = async () => {
      if (cancelled) return;
      const current = accessRef.current;
      if (!current || current.waiting) {
        setReturningNow(false);
        return;
      }
      const result = await current.refresh();
      if (cancelled) return;
      if (result?.error || ++attempts >= 3) {
        setReturningNow(false);
        setMessage(
          'A consulta de retorno terminou. A confirmação pertence ao serviço; você pode conferir novamente.',
        );
        return;
      }
      timer = setTimeout(() => void check(), 1000 * 2 ** attempts);
    };
    timer = setTimeout(() => void check(), 1000);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [wasReturning, onReturnHandled]);
  useEffect(() => {
    if (confirm) confirmation.current?.focus();
  }, [confirm]);

  const refresh = async () => {
    const result = await access?.refresh();
    if (result && !result.error && alive.current)
      setMessage(
        'Situação consultada no serviço. Nenhum pedido foi reenviado.',
      );
  };
  const run = async (
    action: 'checkout' | 'portal' | 'cancel',
    work: (api: ReturnType<typeof createApiClient>) => Promise<void>,
  ) => {
    if (
      uncertainActions.has(action) ||
      acting.current ||
      blocked ||
      !auth ||
      auth.state.phase !== 'authenticated'
    )
      return;
    acting.current = true;
    setBusy(true);
    setError(undefined);
    setMessage('');
    const scope = auth.service.capture();
    try {
      await work(client ?? getApiClient());
    } catch (failure) {
      if (alive.current && scope.isCurrent()) {
        const safe =
          failure instanceof ApiError
            ? failure
            : new ApiError('invalid_response', { mutation: true });
        setError(safe);
        if (safe.outcomeUnknown || safe.status === 409)
          setUncertainActions((previous) => new Set([...previous, action]));
        else if (action === 'checkout') {
          intent.current = undefined;
          setIntentLocked(false);
        }
      }
    } finally {
      acting.current = false;
      if (alive.current && scope.isCurrent()) setBusy(false);
    }
  };
  const openHosted = (kind: 'checkout' | 'portal', price?: Price) =>
    void run(kind, async (api) => {
      const scope = auth!.service.capture();
      if (kind === 'checkout') {
        if (!price || !status || !offersCheckout(status)) return;
        intent.current ??= {
          body: { currency: price.currency, frequency: price.frequency },
          key: createIdempotencyKey(),
        };
        setIntentLocked(true);
      }
      const result =
        kind === 'checkout'
          ? await api.POST('/api/v1/billing/subscribe', {
              body: intent.current!.body,
              params: { header: { 'Idempotency-Key': intent.current!.key } },
            })
          : await api.POST('/api/v1/billing/portal');
      if (!result.data)
        throw new ApiError('invalid_response', { mutation: true });
      const url = hostedUrl(result.data.url, kind);
      if (!alive.current || !scope.isCurrent()) return;
      rememberBillingReturn(
        route.pathname + route.search + route.hash,
        sessionStorageSafe(),
      );
      try {
        go(url);
      } catch {
        clearBillingReturn(sessionStorageSafe());
        throw new ApiError('invalid_response', { mutation: true });
      }
    });
  const cancel = () =>
    void run('cancel', async (api) => {
      const scope = auth!.service.capture();
      const result = await api.POST('/api/v1/billing/cancel');
      if (!result.data || result.data.status !== 'cancellation_scheduled')
        throw new ApiError('invalid_response', { mutation: true });
      if (!alive.current || !scope.isCurrent()) return;
      setConfirm(false);
      setMessage(
        'O serviço recebeu o pedido de cancelamento. Confira a situação e a data informadas abaixo.',
      );
      await access?.refresh();
      if (alive.current && scope.isCurrent()) title.current?.focus();
    });
  const chosen = status?.prices.find((price) => price.id === selected);
  const currentPrice = status?.prices.find(
    (price) => price.id === status.price_id,
  );
  return (
    <main className="pagina assinatura">
      <header>
        <p className="legenda">Sua conta</p>
        <h1 ref={title} tabIndex={-1}>
          Assinatura
        </h1>
        <p>Confira seu acesso e gerencie sua assinatura.</p>
      </header>
      {returningNow && (
        <p role="status">Conferindo a situação após o retorno…</p>
      )}
      {message && <p role="status">{message}</p>}
      {status ? (
        <>
          <section
            className="assinatura-situacao"
            aria-labelledby="situacao-assinatura"
          >
            <h2 id="situacao-assinatura">Situação atual</h2>
            <p className="assinatura-estado">
              {status.status
                ? (STATUS_LABELS[status.status] ?? 'Situação não informada')
                : 'Situação não informada'}
            </p>
            <p>
              {status.access === 'FULL_WRITE'
                ? 'O serviço permite consultar, enviar e alterar dados.'
                : 'Você pode consultar e exportar seus dados.'}
            </p>
            {status.status === 'AWAITING_CARD' && (
              <p>
                Criar a conta não inicia o período gratuito. O cartão é
                confirmado na página hospedada; o serviço informa quando o
                período começa e termina.
              </p>
            )}
            {status.cancel_at_period_end && (
              <p>
                <strong>Cancelamento agendado pelo serviço.</strong> A
                assinatura será encerrada ao fim do período informado.
              </p>
            )}
            <dl>
              {status.status !== 'AWAITING_CARD' && (
                <div>
                  <dt>Preço da assinatura atual</dt>
                  <dd className="numero">
                    {currentPrice
                      ? precoAssinatura(
                          currentPrice.amount_minor,
                          currentPrice.currency,
                          currentPrice.frequency,
                        )
                      : 'Não informado'}
                  </dd>
                </div>
              )}
              {status.trial_started_at ||
              status.trial_ends_at ||
              status.current_period_ends_at ? (
                <>
                  <div>
                    <dt>Início do período gratuito</dt>
                    <dd>
                      {dataHora(status.trial_started_at, 'America/Sao_Paulo')}
                    </dd>
                  </div>
                  <div>
                    <dt>Fim do período gratuito</dt>
                    <dd>
                      {dataHora(status.trial_ends_at, 'America/Sao_Paulo')}
                    </dd>
                  </div>
                  <div>
                    <dt>Fim do período atual</dt>
                    <dd>
                      {dataHora(
                        status.current_period_ends_at,
                        'America/Sao_Paulo',
                      )}
                    </dd>
                  </div>
                </>
              ) : (
                <div>
                  <dt>Datas do período</dt>
                  <dd>O serviço ainda não informou um período confirmado.</dd>
                </div>
              )}
            </dl>
            <button
              type="button"
              disabled={busy || access?.waiting || returningNow}
              onClick={() => void refresh()}
            >
              Atualizar situação
            </button>
          </section>
          {offersCheckout(status) ? (
            <section aria-labelledby="formas-assinatura">
              <h2 id="formas-assinatura">Escolha a forma de assinatura</h2>
              <p>
                Preço e moeda informados pelo serviço.{' '}
                {status.card_required
                  ? 'O cartão é preenchido somente na página segura da Stripe.'
                  : 'Você continua na página segura da Stripe.'}
              </p>
              <fieldset disabled={!!blocked || intentLocked}>
                <legend>Preços disponíveis</legend>
                {status.prices.map((price) => (
                  <label className="assinatura-preco" key={price.id}>
                    <input
                      type="radio"
                      name="preco"
                      checked={selected === price.id}
                      onChange={() => setSelected(price.id)}
                    />
                    <span className="numero">
                      {precoAssinatura(
                        price.amount_minor,
                        price.currency,
                        price.frequency,
                      )}
                    </span>
                  </label>
                ))}
              </fieldset>
              <button
                type="button"
                disabled={
                  !!blocked || uncertainActions.has('checkout') || !chosen
                }
                onClick={() => openHosted('checkout', chosen)}
              >
                Continuar para assinatura
              </button>
            </section>
          ) : (
            (!status.checkout_available || !status.prices.length) && (
              <section aria-labelledby="assinatura-disponibilidade">
                <h2 id="assinatura-disponibilidade">
                  Assinatura indisponível para novos pedidos
                </h2>
                <p>
                  O serviço ainda não disponibilizou uma oferta. Você pode
                  continuar consultando seus registros e conferir novamente mais
                  tarde.
                </p>
              </section>
            )
          )}
          {status.can_manage && (
            <section aria-labelledby="gerenciar-assinatura">
              <h2 id="gerenciar-assinatura">Gerenciar assinatura</h2>
              <p>
                Dados do cartão e pagamentos são gerenciados na página hospedada
                da Stripe.
              </p>
              <div className="acoes">
                <button
                  type="button"
                  disabled={!!blocked || uncertainActions.has('portal')}
                  onClick={() => openHosted('portal')}
                >
                  Abrir gestão da assinatura
                </button>
                {offersCancel(status) && (
                  <button
                    type="button"
                    ref={cancelButton}
                    disabled={!!blocked || uncertainActions.has('cancel')}
                    onClick={() => setConfirm(true)}
                  >
                    Solicitar cancelamento
                  </button>
                )}
              </div>
              {confirm && (
                <div
                  className="assinatura-confirmacao"
                  role="group"
                  aria-label="Confirmar cancelamento"
                >
                  <h3>Solicitar o cancelamento?</h3>
                  <p>
                    O pedido é feito para o fim do período. A data e o resultado
                    serão confirmados pelo serviço.
                  </p>
                  <div className="acoes">
                    <button
                      type="button"
                      ref={confirmation}
                      disabled={!!blocked || uncertainActions.has('cancel')}
                      onClick={cancel}
                    >
                      Confirmar cancelamento
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => {
                        setConfirm(false);
                        cancelButton.current?.focus();
                      }}
                    >
                      Manter assinatura
                    </button>
                  </div>
                </div>
              )}
            </section>
          )}
        </>
      ) : (
        <p role="status">
          {access?.checking || access?.phase === 'checking'
            ? 'Carregando situação da assinatura…'
            : 'A situação da assinatura está indisponível. Use a conferência de acesso acima para consultar novamente.'}
        </p>
      )}
      {busy && <p role="status">Enviando seu pedido…</p>}
      {error !== undefined && (
        <ErroApi
          error={error}
          intent="gravacao"
          destination={route.pathname + route.search}
          actions={{
            conferir: () => void refresh(),
            recarregar: () => void refresh(),
          }}
        />
      )}
      {uncertainActions.size > 0 && (
        <p>
          O resultado deste pedido precisa de conferência. A ação correspondente
          ficou pausada; nenhum pedido será repetido automaticamente.
        </p>
      )}
      <nav aria-label="Continuar no aplicativo">
        <Link to={{ pathname: '/', search: route.search }}>
          Voltar para Apostas
        </Link>
      </nav>
    </main>
  );
}

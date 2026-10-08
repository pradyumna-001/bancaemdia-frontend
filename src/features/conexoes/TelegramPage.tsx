import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useLocation } from 'react-router-dom';
import { getApiClient, type createApiClient } from '../../api/client';
import { ApiError } from '../../api/error';
import { useAuth } from '../../auth/ProvedorAuth';
import { useAcesso } from '../acesso/ProvedorAcesso';
import { ErroApi } from '../../components/ErroApi';
import { useRetryAfter } from '../../lib/useRetryAfter';
import {
  linkCode,
  linkStatus,
  pollDelay,
  telegramDate,
  TELEGRAM_POLL_LIMIT_MS,
  type LinkCode,
} from './telegram';
import './telegram.css';

export function TelegramPage({
  client,
}: {
  client?: ReturnType<typeof createApiClient>;
}) {
  const auth = useAuth();
  const access = useAcesso();
  const api = client ?? getApiClient();
  const location = useLocation();
  const [code, setCode] = useState<LinkCode>();
  const [started, setStarted] = useState<number>();
  const [expired, setExpired] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirmation, setConfirmation] = useState<'generate' | 'revoke'>();
  const [error, setError] = useState<unknown>();
  const [notice, setNotice] = useState('');
  const [copied, setCopied] = useState('');
  const [uncertain, setUncertain] = useState(false);
  const [needsCheck, setNeedsCheck] = useState(false);
  const pending = useRef<AbortController>();
  const life = useRef({ active: true, revision: 0 });
  const codeTitle = useRef<HTMLHeadingElement>(null);
  const confirmTitle = useRef<HTMLHeadingElement>(null);
  const confirmButton = useRef<HTMLButtonElement>(null);
  const waiting = useRetryAfter(error);
  const query = useQuery({
    queryKey: [
      'telegram-link',
      auth?.state.privateEpoch,
      auth?.state.person?.id,
    ],
    enabled: auth?.state.phase === 'authenticated',
    queryFn: async ({ signal }) => {
      const status = await auth!.service.read(async () =>
        linkStatus((await api.GET('/api/v1/telegram/link', { signal })).data),
      );
      if (life.current.active && !signal.aborted && status.linked) {
        setCode(undefined);
        setStarted(undefined);
        setCopied('');
        setExpired(false);
      }
      return status;
    },
    retryOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchIntervalInBackground: false,
    refetchInterval: (current) =>
      started === undefined || current.state.error || current.state.data?.linked
        ? false
        : pollDelay(started, Date.now()),
  });
  const queryWaiting = useRetryAfter(query.error);
  const blocked =
    busy ||
    waiting ||
    queryWaiting ||
    query.isFetching ||
    !query.data ||
    query.isError;
  const clearCode = () => {
    setCode(undefined);
    setStarted(undefined);
    setCopied('');
  };
  useEffect(() => {
    const current = life.current;
    current.active = true;
    return () => {
      current.active = false;
      current.revision++;
      pending.current?.abort();
    };
  }, []);
  useEffect(() => {
    if (code) codeTitle.current?.focus();
  }, [code]);
  useEffect(() => {
    if (confirmation) confirmTitle.current?.focus();
  }, [confirmation]);
  useEffect(() => {
    if (!code) return;
    const timer = setTimeout(
      () => {
        setCode(undefined);
        setStarted(undefined);
        setCopied('');
        setExpired(true);
      },
      Math.min(
        30 * 60 * 1000,
        Math.max(0, Date.parse(code.expires_at) - Date.now()),
      ),
    );
    return () => clearTimeout(timer);
  }, [code]);
  useEffect(() => {
    if (started === undefined) return;
    const timer = setTimeout(
      () => setStarted(undefined),
      Math.max(0, started + TELEGRAM_POLL_LIMIT_MS - Date.now()),
    );
    return () => clearTimeout(timer);
  }, [started]);
  async function consult() {
    if (busy || query.isFetching || queryWaiting || !auth) return;
    const scope = auth.service.capture();
    const status = await query.refetch();
    if (!life.current.active || !scope.isCurrent() || status.error) return;
    setNeedsCheck(false);
  }
  async function mutate(action: 'generate' | 'revoke') {
    if (
      pending.current ||
      blocked ||
      !auth ||
      !access ||
      (action === 'revoke' && uncertain) ||
      (action === 'generate' && needsCheck)
    )
      return;
    const operation =
      action === 'generate'
        ? 'POST /api/v1/telegram/link-codes'
        : 'DELETE /api/v1/telegram/link';
    if (!access.can(operation)) return;
    const scope = auth.service.capture();
    const controller = new AbortController();
    pending.current = controller;
    const revision = ++life.current.revision;
    const current = () =>
      life.current.active &&
      revision === life.current.revision &&
      !controller.signal.aborted &&
      scope.isCurrent();
    setBusy(true);
    setError(undefined);
    setNotice('');
    setConfirmation(undefined);
    clearCode();
    setExpired(false);
    let deletionAccepted = false;
    try {
      if (action === 'generate') {
        const data = await access.run(operation, async () => {
          const result = await api.POST('/api/v1/telegram/link-codes', {
            signal: controller.signal,
          });
          if (result.response.status !== 201)
            throw new ApiError('invalid_response', { mutation: true });
          return linkCode(result.data);
        });
        if (!current()) return;
        if (Date.parse(data.expires_at) <= Date.now()) {
          setExpired(true);
          return;
        }
        setCode(data);
        setStarted(Date.now());
        setUncertain(false);
      } else {
        const data = await access.run(
          operation,
          async () =>
            (
              await api.DELETE('/api/v1/telegram/link', {
                signal: controller.signal,
              })
            ).data,
        );
        if (!current()) return;
        if (!data || typeof data.revoked !== 'boolean')
          throw new ApiError('invalid_response', { mutation: true });
        deletionAccepted = true;
        const status = await query.refetch();
        if (!current()) return;
        if (status.error) throw status.error;
        if (!status.data || status.data.linked) {
          setNotice(
            'A revogação foi processada, mas o estado atual ainda indica vínculo. Confira a conexão.',
          );
        } else {
          setNotice(
            data.revoked
              ? 'Vínculo revogado. Códigos anteriores foram invalidados.'
              : 'Não havia vínculo ativo. Códigos anteriores foram invalidados.',
          );
          setUncertain(false);
        }
      }
    } catch (cause) {
      if (!current()) return;
      const safe =
        cause instanceof ApiError
          ? cause
          : new ApiError('invalid_response', { mutation: true });
      const unknown =
        safe.outcomeUnknown || safe.status === 409 || deletionAccepted;
      setError(safe);
      setUncertain(unknown);
      setNeedsCheck(unknown);
      setStarted(undefined);
    } finally {
      if (pending.current === controller) pending.current = undefined;
      if (life.current.active && revision === life.current.revision)
        setBusy(false);
    }
  }
  async function copy() {
    if (!code || Date.parse(code.expires_at) <= Date.now() || !auth) return;
    const scope = auth.service.capture();
    const revision = life.current.revision;
    try {
      await navigator.clipboard.writeText(`/vincular ${code.code}`);
      if (
        scope.isCurrent() &&
        life.current.active &&
        revision === life.current.revision
      )
        setCopied('Comando copiado.');
    } catch {
      if (
        scope.isCurrent() &&
        life.current.active &&
        revision === life.current.revision
      )
        setCopied(
          'Não foi possível copiar. Selecione o comando e use a opção Copiar do seu dispositivo.',
        );
    }
  }
  const destination = location.pathname + location.search;
  const ask = (action: 'generate' | 'revoke') => {
    setConfirmation(action);
    setNotice('');
  };
  return (
    <main className="pagina pagina-interna telegram-pagina">
      <p className="legenda">Configurações · Conexões</p>
      <h1>Telegram</h1>
      <p>
        Conecte sua conta para enviar uma foto de aposta em conversa privada com
        o bot.
      </p>
      <a href="#telegram-bot-lancamento">
        Abrir bot do bancaemdia (link fictício)
      </a>
      <p id="telegram-bot-lancamento" className="telegram-lancamento">
        Este link é ilustrativo. O endereço real do bot será divulgado no
        lançamento.
      </p>
      {query.isPending && <p role="status">Consultando conexão…</p>}
      {query.error && (
        <ErroApi
          error={query.error}
          intent="leitura"
          destination={destination}
          actions={{ tentar: () => void consult() }}
        />
      )}
      {query.data && (
        <section className="telegram-painel" aria-labelledby="telegram-estado">
          <h2 id="telegram-estado">
            {query.data.linked
              ? 'Telegram conectado'
              : 'Telegram não conectado'}
          </h2>
          {query.data.linked ? (
            <>
              <dl className="telegram-dados">
                <div>
                  <dt>Conectado em</dt>
                  <dd>{telegramDate(query.data.linked_at)}</dd>
                </div>
                <div>
                  <dt>Última mensagem recebida</dt>
                  <dd>{telegramDate(query.data.last_inbound_at)}</dd>
                </div>
                <div>
                  <dt>Última mensagem enviada</dt>
                  <dd>{telegramDate(query.data.last_outbound_at)}</dd>
                </div>
              </dl>
              <p>
                Essas datas indicam tráfego registrado; não mostram se você ou o
                bot está online.
              </p>
              <button
                ref={confirmButton}
                type="button"
                disabled={blocked || uncertain}
                onClick={() => ask('revoke')}
              >
                Revogar vínculo
              </button>
            </>
          ) : (
            <>
              <p>
                Gere um código e envie o comando na conversa privada quando o
                bot estiver disponível. O código é de uso único e vale por até
                30 minutos.
              </p>
              <button
                ref={confirmButton}
                type="button"
                disabled={blocked || !!code || expired || uncertain}
                onClick={() => void mutate('generate')}
              >
                {busy ? 'Processando…' : 'Gerar código temporário'}
              </button>
              {(expired || uncertain) && (
                <button
                  ref={confirmButton}
                  type="button"
                  disabled={blocked || needsCheck}
                  onClick={() => ask('generate')}
                >
                  Preparar novo código
                </button>
              )}
            </>
          )}
          <button
            type="button"
            disabled={busy || query.isFetching || queryWaiting}
            onClick={() => void consult()}
          >
            {query.isFetching ? 'Consultando…' : 'Consultar vínculo'}
          </button>
          {query.isError && (
            <p>
              Os dados acima são da última consulta confirmada. Confira a
              conexão antes de outra ação.
            </p>
          )}
        </section>
      )}
      {confirmation && (
        <section
          className="telegram-confirmacao"
          aria-labelledby="telegram-confirmar"
        >
          <h2 id="telegram-confirmar" tabIndex={-1} ref={confirmTitle}>
            {confirmation === 'revoke'
              ? 'Revogar esta conexão?'
              : 'Gerar um novo código?'}
          </h2>
          <p>
            {confirmation === 'revoke'
              ? 'O bot deixará de receber novas entradas desta identidade. Códigos anteriores e rascunhos pendentes serão invalidados; apostas já registradas permanecem.'
              : 'O novo código invalida qualquer código anterior que ainda não foi usado. A emissão anterior não será repetida.'}
          </p>
          <div className="acoes">
            <button
              type="button"
              disabled={blocked}
              onClick={() => void mutate(confirmation)}
            >
              {confirmation === 'revoke'
                ? 'Confirmar revogação'
                : 'Confirmar novo código'}
            </button>
            <button
              type="button"
              onClick={() => {
                setConfirmation(undefined);
                confirmButton.current?.focus();
              }}
            >
              Voltar
            </button>
          </div>
        </section>
      )}
      {code && (
        <section className="telegram-painel" aria-labelledby="telegram-codigo">
          <h2 id="telegram-codigo" tabIndex={-1} ref={codeTitle}>
            Seu comando de conexão
          </h2>
          <p>
            Envie este comando somente na conversa privada com o bot do
            bancaemdia:
          </p>
          <p className="telegram-comando numero">
            <code>{`/vincular ${code.code}`}</code>
          </p>
          <p>
            Expira em {telegramDate(code.expires_at)}. Não compartilhe o código.
          </p>
          <div className="acoes">
            <button type="button" onClick={() => void copy()}>
              Copiar comando
            </button>
            <button
              type="button"
              onClick={() => {
                life.current.revision++;
                clearCode();
                setExpired(true);
                setNotice(
                  'Código ocultado. Sair desta tela também remove o código; isso não revoga o código no servidor.',
                );
              }}
            >
              Ocultar código e parar consulta
            </button>
          </div>
          {copied && <p role="status">{copied}</p>}
          <p>
            {started === undefined || query.isError
              ? 'A consulta automática está pausada. Use Consultar vínculo para conferir; o código não será reenviado.'
              : 'Consultando o vínculo por até dois minutos enquanto esta tela estiver visível.'}
          </p>
        </section>
      )}
      {expired && (
        <p role="status">
          O código não está mais disponível nesta tela. Se expirou ou já foi
          usado, prepare um novo código; a validade é conferida pelo servidor.
        </p>
      )}
      {uncertain && (
        <p>
          A ação terminou sem confirmação. Consulte o vínculo antes de decidir;
          não repetiremos a emissão ou revogação automaticamente.
        </p>
      )}
      {error !== undefined && (
        <ErroApi error={error} intent="gravacao" destination={destination} />
      )}
      {notice && <p role="status">{notice}</p>}
      <details className="telegram-painel">
        <summary>Como funciona o envio de uma foto</summary>
        <ol>
          <li>
            Quando o bot for divulgado, conecte sua conta usando o comando
            temporário em conversa privada.
          </li>
          <li>
            Envie uma foto de um bilhete. O bot prepara um rascunho para você
            conferir.
          </li>
          <li>
            Corrija o que for necessário e confirme no Telegram. A aposta só é
            registrada após a confirmação.
          </li>
        </ol>
        <p>
          Esta tela não mostra mensagens privadas nem rascunhos do bot. Para
          importar um histórico exportado do Telegram, use Enviar.
        </p>
      </details>
      <div className="acoes">
        <Link to={`/enviar${location.search}`}>
          Importar histórico em Enviar
        </Link>
        <Link to={`/configuracoes${location.search}`}>
          Voltar para Configurações
        </Link>
      </div>
    </main>
  );
}

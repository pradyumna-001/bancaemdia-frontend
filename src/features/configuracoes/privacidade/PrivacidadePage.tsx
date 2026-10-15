import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { getApiClient } from '../../../api/client';
import { ApiError } from '../../../api/error';
import type { components } from '../../../api/schema';
import { useAuth } from '../../../auth/ProvedorAuth';
import { ErroApi } from '../../../components/ErroApi';
import { useRetryAfter } from '../../../lib/useRetryAfter';
import { useAcesso } from '../../acesso/ProvedorAcesso';
import './privacidade.css';

const EXPORT = '/api/v1/usuario/me/export';
const REMOVE = 'DELETE /api/v1/usuario/me';
const XLSX =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

export function PrivacidadePage({
  client,
}: {
  client?: ReturnType<typeof getApiClient>;
}) {
  const auth = useAuth();
  return auth &&
    (auth.state.phase === 'authenticated' ||
      (auth.state.phase === 'checking' && auth.state.person)) ? (
    <Privacidade key={auth.state.privateEpoch} api={client ?? getApiClient()} />
  ) : (
    <main className="pagina">
      <h1>Privacidade</h1>
      <p role="status">Consultando sessão…</p>
    </main>
  );
}

function Privacidade({ api }: { api: ReturnType<typeof getApiClient> }) {
  const auth = useAuth()!;
  const access = useAcesso();
  const location = useLocation();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>();
  const [intent, setIntent] = useState<'leitura' | 'gravacao'>('leitura');
  const [format, setFormat] = useState<'json' | 'xlsx'>('json');
  const [notice, setNotice] = useState('');
  const [uncertain, setUncertain] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [open, setOpen] = useState(false);
  const active = useRef<AbortController>();
  const resource = useRef<string>();
  const alive = useRef(true);
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLButtonElement>(null);
  const cancel = useRef<HTMLButtonElement>(null);
  const waiting = useRetryAfter(error);
  const assisted =
    intent === 'gravacao' && error instanceof ApiError && error.status === 409;
  const blocked = busy || waiting;
  const destination = location.pathname + location.search;
  useEffect(() => {
    alive.current = true;
    const clean = () => {
      active.current?.abort();
      if (resource.current) URL.revokeObjectURL(resource.current);
      resource.current = undefined;
      setNotice('');
      setError(undefined);
      setOpen(false);
      setConfirmed(false);
    };
    const unregister = auth.service.registerCleanup(clean);
    return () => {
      alive.current = false;
      clean();
      unregister();
    };
  }, [auth.service]);
  useEffect(() => {
    if (!open) return;
    const modal = dialog.current;
    const trigger = opener.current;
    modal?.showModal();
    cancel.current?.focus();
    return () => {
      modal?.close();
      if (trigger?.isConnected) trigger.focus();
    };
  }, [open]);

  async function download(chosen = format) {
    if (active.current || blocked) return;
    const scope = auth.service.capture();
    if (!scope.isCurrent()) return;
    const request = new AbortController();
    active.current = request;
    const epoch = auth.state.privateEpoch;
    const sameOwner = () =>
      alive.current &&
      !request.signal.aborted &&
      auth.service.getSnapshot().privateEpoch === epoch;
    const current = () =>
      alive.current && !request.signal.aborted && scope.isCurrent();
    setBusy(true);
    setError(undefined);
    setNotice('');
    setIntent('leitura');
    setFormat(chosen);
    try {
      const data = await auth.service.read(
        async () =>
          (
            await api.GET(EXPORT, {
              signal: request.signal,
              params: { query: { formato: chosen } },
              parseAs: 'blob',
            })
          ).data,
      );
      if (!current()) return;
      if (
        !(data instanceof Blob) ||
        !data.size ||
        data.type.split(';')[0] !==
          (chosen === 'json' ? 'application/json' : XLSX)
      )
        throw new ApiError('invalid_response');
      const url = URL.createObjectURL(data);
      resource.current = url;
      const link = document.createElement('a');
      link.href = url;
      link.download = `meus-dados.${chosen}`;
      try {
        link.click();
      } finally {
        URL.revokeObjectURL(url);
        resource.current = undefined;
      }
      setNotice(
        `Arquivo ${chosen === 'json' ? 'JSON' : 'Excel'} preparado para baixar.`,
      );
    } catch (cause) {
      if (current()) setError(cause);
    } finally {
      if (active.current === request) active.current = undefined;
      if (sameOwner()) setBusy(false);
    }
  }

  async function closeAccount() {
    if (
      !confirmed ||
      active.current ||
      blocked ||
      uncertain ||
      !access?.can(REMOVE)
    )
      return;
    const scope = auth.service.capture();
    if (!scope.isCurrent()) return;
    const request = new AbortController();
    active.current = request;
    const epoch = auth.state.privateEpoch;
    const sameOwner = () =>
      alive.current &&
      !request.signal.aborted &&
      auth.service.getSnapshot().privateEpoch === epoch;
    const current = () =>
      alive.current && !request.signal.aborted && scope.isCurrent();
    setBusy(true);
    setOpen(false);
    setError(undefined);
    setNotice('');
    setIntent('gravacao');
    try {
      const data: components['schemas']['AnonymizeResponse'] | undefined =
        await access.run(
          REMOVE,
          async () =>
            (await api.DELETE('/api/v1/usuario/me', { signal: request.signal }))
              .data,
        );
      if (!current()) {
        if (sameOwner()) throw new ApiError('cancelled', { mutation: true });
        return;
      }
      if (data?.status !== 'anonymized')
        throw new ApiError('invalid_response', { mutation: true });
      navigate('/login', { replace: true });
      auth.service.accountClosed();
    } catch (cause) {
      if (sameOwner()) {
        const safe = !scope.isCurrent()
          ? new ApiError('cancelled', { mutation: true })
          : cause instanceof ApiError
            ? cause
            : new ApiError('invalid_response', { mutation: true });
        setError(safe);
        setUncertain(safe.outcomeUnknown);
      }
    } finally {
      if (active.current === request) active.current = undefined;
      if (sameOwner()) setBusy(false);
    }
  }

  async function checkSession() {
    if (active.current || blocked) return;
    setBusy(true);
    const epoch = auth.state.privateEpoch;
    try {
      await auth.service.resume();
      if (
        alive.current &&
        auth.service.getSnapshot().privateEpoch === epoch &&
        auth.service.getSnapshot().phase === 'authenticated'
      )
        setNotice(
          'A conta continua acessível. O resultado do encerramento anterior permanece sem confirmação. Não reenvie o pedido; procure o suporte pelo canal combinado com a equipe.',
        );
    } finally {
      if (alive.current && auth.service.getSnapshot().privateEpoch === epoch)
        setBusy(false);
    }
  }

  return (
    <main className="pagina privacidade">
      <header>
        <p className="legenda">SUA CONTA</p>
        <h1>Privacidade</h1>
        <p>Baixe seus registros ou solicite o encerramento da conta.</p>
        <Link to={'/configuracoes' + location.search}>
          Voltar às configurações
        </Link>
      </header>
      <section
        className="privacidade-secao"
        aria-labelledby="exportar-registros"
      >
        <h2 id="exportar-registros">Exportar meus registros</h2>
        <p>
          Baixe os registros disponíveis da sua conta, sem depender de uma
          assinatura ativa.
        </p>
        <p>
          Este arquivo é diferente do Excel do Painel: reúne os registros
          pessoais disponíveis para exportação e não aplica os filtros da
          página.
        </p>
        <p>
          Não inclui imagens, arquivos binários nem o conteúdo compartilhado de
          mensagens e fotos. O arquivo contém dados pessoais; guarde-o em um
          local de sua escolha.
        </p>
        <div className="privacidade-acoes">
          <button disabled={blocked} onClick={() => void download('json')}>
            {busy && intent === 'leitura' && format === 'json'
              ? 'Preparando JSON…'
              : 'Baixar JSON'}
          </button>
          <button disabled={blocked} onClick={() => void download('xlsx')}>
            {busy && intent === 'leitura' && format === 'xlsx'
              ? 'Preparando Excel…'
              : 'Baixar Excel'}
          </button>
        </div>
      </section>
      {!!notice && (
        <p role="status" className="privacidade-aviso">
          {notice}
        </p>
      )}
      {!!error && !assisted && (
        <ErroApi
          error={error}
          intent={intent}
          contexto={
            intent === 'leitura'
              ? 'Exportação pessoal'
              : 'Encerramento da conta'
          }
          destination={destination}
          actions={
            intent === 'leitura' ? { tentar: () => void download() } : {}
          }
        />
      )}
      <section className="privacidade-secao" aria-labelledby="encerrar-conta">
        <h2 id="encerrar-conta">Encerrar minha conta</h2>
        <p>
          A conta será desativada e anonimizada. Os registros abrangidos pelo
          serviço serão removidos; eventos de auditoria podem permanecer sem o
          conteúdo original. Este encerramento não mantém o cadastro para
          recomeçar.
        </p>
        <p>
          Uma assinatura ativa pode precisar ser cancelada e confirmada antes do
          encerramento. Mensagens ou fotos importadas podem exigir exclusão
          assistida. Nesses casos, o serviço recusa o pedido sem alterar a
          conta.
        </p>
        <div className="privacidade-acoes">
          <Link to={'/assinatura' + location.search}>Consultar assinatura</Link>
        </div>
        {assisted && (
          <div role="alert" className="privacidade-aviso">
            <h3>O encerramento precisa de acompanhamento</h3>
            <p>
              O serviço recusou o encerramento e manteve a conta. Confira a
              assinatura. Se houver mensagens ou fotos importadas, procure o
              suporte pelo canal combinado com a equipe para a exclusão
              assistida.
            </p>
          </div>
        )}
        {uncertain && (
          <div className="privacidade-aviso">
            <h3>O resultado ainda não foi confirmado</h3>
            <p>
              O pedido pode ter sido recebido. Não vamos reenviá-lo. Consultar a
              sessão não comprova que a conta foi apagada.
            </p>
            <button disabled={blocked} onClick={() => void checkSession()}>
              Consultar sessão
            </button>
          </div>
        )}
        <button
          ref={opener}
          disabled={blocked || uncertain || !access?.can(REMOVE)}
          onClick={() => {
            setConfirmed(false);
            setOpen(true);
          }}
        >
          Solicitar encerramento
        </button>
      </section>
      <dialog
        ref={dialog}
        aria-labelledby="confirmar-encerramento"
        onCancel={(event) => {
          event.preventDefault();
          setOpen(false);
        }}
      >
        <h2 id="confirmar-encerramento">Encerrar esta conta?</h2>
        <p>
          Exporte os registros que deseja guardar antes de continuar. A
          desativação e a anonimização serão executadas pelo serviço e não podem
          ser desfeitas por esta tela.
        </p>
        <label className="privacidade-confirmacao">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(event) => setConfirmed(event.target.checked)}
          />
          Entendo o encerramento e quero continuar.
        </label>
        <div className="privacidade-acoes">
          <button ref={cancel} onClick={() => setOpen(false)}>
            Manter minha conta
          </button>
          <button
            disabled={!confirmed || blocked}
            onClick={() => void closeAccount()}
          >
            Confirmar encerramento
          </button>
        </div>
      </dialog>
    </main>
  );
}

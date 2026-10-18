import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useLocation } from 'react-router-dom';
import { getApiClient } from '../../api/client';
import { ApiError } from '../../api/error';
import { useAuth } from '../../auth/ProvedorAuth';
import { ErroApi } from '../../components/ErroApi';
import { useRetryAfter } from '../../lib/useRetryAfter';
import { useAcesso } from '../acesso/ProvedorAcesso';
import {
  LIST,
  PAIR,
  ROTATE,
  REVOKE,
  installations,
  pairing,
  rotated,
  credential,
  maskedPrefix,
  coletaDate,
  type Installation,
} from './coleta';
import './coleta.css';

export function ColetaPage({
  client,
}: {
  client?: ReturnType<typeof getApiClient>;
}) {
  const auth = useAuth();
  return auth && auth.state.person ? (
    <Coleta key={auth.state.privateEpoch} api={client ?? getApiClient()} />
  ) : (
    <main className="pagina">
      <h1>Coleta</h1>
      <p role="status">Consultando sessão…</p>
    </main>
  );
}
function Coleta({ api }: { api: ReturnType<typeof getApiClient> }) {
  const auth = useAuth()!;
  const access = useAcesso();
  const location = useLocation();
  const [secret, setSecret] = useState<{
    value: string;
    expires: string | null;
    kind: 'code' | 'token';
  }>();
  const [confirmation, setConfirmation] = useState<{
    action: 'rotate' | 'revoke';
    row: Installation;
  }>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>();
  const [notice, setNotice] = useState('');
  const [copied, setCopied] = useState('');
  const [needsCheck, setNeedsCheck] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const pending = useRef<AbortController>();
  const alive = useRef(false);
  const version = useRef(0);
  const title = useRef<HTMLHeadingElement>(null);
  const confirmTitle = useRef<HTMLHeadingElement>(null);
  const opener = useRef<HTMLButtonElement | null>(null);
  const waiting = useRetryAfter(error);
  const query = useQuery({
    queryKey: [
      'coleta-installations',
      auth.state.privateEpoch,
      auth.state.person?.id,
    ],
    enabled: auth.state.phase === 'authenticated',
    queryFn: ({ signal }) =>
      auth.service.read(async () =>
        installations((await api.GET(LIST, { signal })).data),
      ),
    retryOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
  const queryWaiting = useRetryAfter(query.error);
  const blocked =
    busy ||
    waiting ||
    queryWaiting ||
    query.isFetching ||
    !query.data ||
    query.isError ||
    needsCheck;
  useEffect(() => {
    alive.current = true;
    const clean = () => {
      version.current++;
      pending.current?.abort();
      setSecret(undefined);
      setCopied('');
      setConfirmation(undefined);
    };
    const unregister = auth.service.registerCleanup(clean);
    return () => {
      alive.current = false;
      clean();
      unregister();
    };
  }, [auth.service]);
  useEffect(() => {
    if (secret) title.current?.focus();
  }, [secret]);
  useEffect(() => {
    if (confirmation) confirmTitle.current?.focus();
  }, [confirmation]);
  useEffect(() => {
    if (!confirmation) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setConfirmation(undefined);
        opener.current?.focus();
      }
    };
    document.addEventListener('keydown', close);
    return () => document.removeEventListener('keydown', close);
  }, [confirmation]);
  useEffect(() => {
    if (!secret?.expires) return;
    const timer = setTimeout(
      () => {
        version.current++;
        setSecret(undefined);
        setCopied('');
        setNotice(
          secret.kind === 'code'
            ? 'O código expirou e foi removido desta tela. Gere outro quando precisar.'
            : 'A credencial não está mais disponível nesta tela. Faça um novo pareamento quando precisar.',
        );
      },
      Math.min(
        30 * 60 * 1000,
        Math.max(0, Date.parse(secret.expires) - Date.now()),
      ),
    );
    return () => clearTimeout(timer);
  }, [secret]);
  async function consult() {
    if (pending.current || busy || query.isFetching || queryWaiting || waiting)
      return;
    const scope = auth.service.capture();
    const result = await query.refetch();
    if (alive.current && scope.isCurrent() && !result.error)
      setNeedsCheck(false);
  }
  async function ask(
    action: 'rotate' | 'revoke',
    row: Installation,
    button: HTMLButtonElement,
  ) {
    if (blocked || pending.current) return;
    opener.current = button;
    const scope = auth.service.capture();
    const result = await query.refetch();
    if (!alive.current || !scope.isCurrent() || result.error) return;
    const current = result.data?.find(
      (item) => item.instalacao_publica_id === row.instalacao_publica_id,
    );
    if (!current || current.revogado_em) {
      setNotice('O dispositivo já foi revogado ou não está mais disponível.');
      return;
    }
    setConfirmation({ action, row: current });
    setSecret(undefined);
    setCopied('');
  }
  async function mutate(
    action: 'pair' | 'rotate' | 'revoke',
    row?: Installation,
  ) {
    if (blocked || pending.current || !access || (action !== 'pair' && !row))
      return;
    const operation =
      action === 'pair' ? PAIR : action === 'rotate' ? ROTATE : REVOKE;
    if (!access.can(operation)) return;
    const scope = auth.service.capture();
    const controller = new AbortController();
    pending.current = controller;
    const revision = ++version.current;
    const current = () =>
      alive.current &&
      scope.isCurrent() &&
      !controller.signal.aborted &&
      version.current === revision;
    setBusy(true);
    setError(undefined);
    setSecret(undefined);
    setCopied('');
    setNotice('');
    setConfirmation(undefined);
    try {
      await access.run(operation, async () => {
        if (action === 'pair') {
          const result = await api.POST('/api/v1/coleta/pairing-codes', {
            signal: controller.signal,
          });
          if (result.response.status !== 201)
            throw new ApiError('invalid_response', { mutation: true });
          const code = pairing(result.data);
          if (current()) {
            if (Date.parse(code.expira_em) > Date.now())
              setSecret({
                value: code.codigo,
                expires: code.expira_em,
                kind: 'code',
              });
            else
              setNotice(
                'O código recebido já expirou. Gere outro quando precisar.',
              );
          }
        } else if (action === 'rotate') {
          const result = await api.POST(
            '/api/v1/coleta/installations/{instalacao_id}/rotate',
            {
              params: { path: { instalacao_id: row!.id } },
              signal: controller.signal,
            },
          );
          const token = rotated(result.data, row!.id);
          if (current())
            setSecret({ value: token, expires: row!.expira_em, kind: 'token' });
        } else {
          const result = await api.DELETE(
            '/api/v1/coleta/installations/{instalacao_id}',
            {
              params: { path: { instalacao_id: row!.id } },
              signal: controller.signal,
            },
          );
          if (result.response.status !== 204)
            throw new ApiError('invalid_response', { mutation: true });
          if (current())
            setNotice(
              'Revogação confirmada para este dispositivo. Os demais dispositivos e apostas registradas permanecem.',
            );
        }
      });
      if (!current()) return;
      setUncertain(false);
      if (action !== 'pair') await query.refetch();
    } catch (cause) {
      if (!current()) return;
      const safe =
        cause instanceof ApiError
          ? cause
          : new ApiError('invalid_response', { mutation: true });
      setError(safe);
      setUncertain(safe.outcomeUnknown);
      setNeedsCheck(safe.outcomeUnknown);
    } finally {
      if (pending.current === controller) pending.current = undefined;
      if (alive.current && !pending.current) setBusy(false);
    }
  }
  async function copy() {
    if (!secret || (secret.expires && Date.parse(secret.expires) <= Date.now()))
      return;
    const revision = version.current;
    const scope = auth.service.capture();
    let message = 'Copiado. Cole somente na sua extensão.';
    try {
      await navigator.clipboard.writeText(secret.value);
    } catch {
      message =
        'Não foi possível copiar. Selecione o texto e use Copiar no seu dispositivo.';
    }
    if (alive.current && scope.isCurrent() && revision === version.current)
      setCopied(message);
  }
  const destination = location.pathname + location.search;
  const help = new URLSearchParams(location.search);
  help.set('guia', 'coleta');
  return (
    <main className="pagina pagina-interna coleta-pagina">
      <header className="coleta-abertura">
        <div>
          <p className="legenda">Seus dispositivos</p>
          <h1>Coleta</h1>
          <p>Acompanhe a extensão e controle o acesso de cada dispositivo.</p>
        </div>
        <Link to={`/tutorial?${help}#passo-a-passo`}>
          Como conectar a extensão
        </Link>
      </header>
      <section className="coleta-conectar" aria-labelledby="coleta-conectar">
        <div>
          <h2 id="coleta-conectar">Conectar um dispositivo</h2>
          <p>
            Gere um código de uso único e cole na extensão. Cada dispositivo
            mantém seu próprio acesso.
          </p>
          <p>
            <Link to={`/extensao${location.search}`}>
              Extensão · esperando lançamento
            </Link>
          </p>
        </div>
        <button
          type="button"
          disabled={blocked || !!secret || !access?.can(PAIR)}
          onClick={() => void mutate('pair')}
        >
          {busy ? 'Processando…' : 'Gerar código de conexão'}
        </button>
      </section>
      {secret && (
        <section className="coleta-segredo" aria-labelledby="coleta-segredo">
          <h2 id="coleta-segredo" ref={title} tabIndex={-1}>
            {secret.kind === 'code'
              ? 'Seu código de conexão'
              : 'Nova credencial do dispositivo'}
          </h2>
          <p>
            {secret.kind === 'code'
              ? 'Cole este código somente na extensão do seu dispositivo. Não compartilhe.'
              : 'A credencial anterior foi invalidada. Esta é a única exibição da nova credencial; transfira somente para a extensão deste dispositivo.'}
          </p>
          <p className="coleta-codigo numero">
            <code>{secret.value}</code>
          </p>
          {secret.expires && <p>Expira em {coletaDate(secret.expires)}.</p>}
          <div className="acoes">
            <button type="button" onClick={() => void copy()}>
              Copiar {secret.kind === 'code' ? 'código' : 'credencial'}
            </button>
            <button
              type="button"
              onClick={() => {
                version.current++;
                setSecret(undefined);
                setCopied('');
                setNotice(
                  'Segredo removido desta tela. Isso não o revoga no servidor.',
                );
              }}
            >
              Ocultar e concluir
            </button>
          </div>
          {copied && <p role="status">{copied}</p>}
        </section>
      )}
      {confirmation && (
        <section
          className="coleta-confirmacao"
          aria-labelledby="coleta-confirmar"
        >
          <h2 id="coleta-confirmar" ref={confirmTitle} tabIndex={-1}>
            {confirmation.action === 'rotate'
              ? 'Trocar credencial'
              : 'Revogar acesso'}
            : {confirmation.row.nome_dispositivo ?? 'Dispositivo sem nome'}?
          </h2>
          <p>
            {confirmation.action === 'rotate'
              ? 'A credencial antiga deixará de funcionar imediatamente. A nova será mostrada uma única vez e precisará ser transferida para este dispositivo. Se a resposta se perder, ela não pode ser recuperada pela lista; faça um novo pareamento pela extensão.'
              : 'Este dispositivo deixará de enviar novas capturas. Para voltar, será necessário parear novamente. Envios já aceitos podem continuar sendo processados.'}{' '}
            Outros dispositivos não serão alterados. Esta ação não encerra a
            sessão de coleta nem amplia sua fronteira.
          </p>
          <div className="acoes">
            <button
              type="button"
              disabled={blocked}
              onClick={() => void mutate(confirmation.action, confirmation.row)}
            >
              Confirmar{' '}
              {confirmation.action === 'rotate' ? 'troca' : 'revogação'}
            </button>
            <button
              type="button"
              onClick={() => {
                setConfirmation(undefined);
                opener.current?.focus();
              }}
            >
              Voltar
            </button>
          </div>
        </section>
      )}
      {uncertain && (
        <p role="status">
          A ação terminou sem confirmação e não será repetida automaticamente.
          Consulte os dispositivos antes de uma nova decisão. A lista mostra o
          estado atual; não recupera códigos ou credenciais nem comprova esta
          tentativa.
        </p>
      )}
      {error !== undefined && (
        <ErroApi error={error} intent="gravacao" destination={destination} />
      )}
      {notice && <p role="status">{notice}</p>}
      <section aria-labelledby="coleta-dispositivos">
        <div className="coleta-lista-topo">
          <h2 id="coleta-dispositivos">Dispositivos</h2>
          <button
            type="button"
            disabled={busy || query.isFetching || queryWaiting || waiting}
            onClick={() => void consult()}
          >
            {query.isFetching ? 'Consultando…' : 'Consultar dispositivos'}
          </button>
        </div>
        <p>
          Esta lista inclui todos os seus dispositivos. Os filtros de apostas
          não se aplicam aqui. Último uso e sessão aberta não indicam conexão
          online.
        </p>
        {query.isPending && <p role="status">Carregando dispositivos…</p>}
        {query.error && (
          <ErroApi
            error={query.error}
            intent="leitura"
            destination={destination}
            actions={{ tentar: () => void consult() }}
          />
        )}
        {query.isError && query.data && (
          <p>
            Dados da última consulta confirmada. Consulte novamente antes de
            alterar um dispositivo.
          </p>
        )}
        {query.data?.length === 0 && (
          <div className="coleta-vazio">
            <h3>Nenhum dispositivo conectado</h3>
            <p>
              Quando a extensão estiver disponível, gere um código acima e
              conecte seu primeiro dispositivo. Você também pode{' '}
              <Link to={`/enviar${location.search}`}>
                enviar arquivos pelo site
              </Link>
              .
            </p>
          </div>
        )}
        <div className="coleta-dispositivos">
          {query.data?.map((row) => (
            <article
              key={row.instalacao_publica_id}
              className="coleta-dispositivo"
              aria-label={row.nome_dispositivo ?? 'Dispositivo sem nome'}
            >
              <header>
                <div>
                  <h3>{row.nome_dispositivo ?? 'Dispositivo sem nome'}</h3>
                  <p className="coleta-prefixo numero">
                    {maskedPrefix(row.token_prefixo)}
                  </p>
                </div>
                <p className="coleta-estado">{credential(row)}</p>
              </header>
              <dl className="coleta-dados">
                <div>
                  <dt>Último uso registrado</dt>
                  <dd>{coletaDate(row.ultimo_uso_em)}</dd>
                </div>
                <div>
                  <dt>Sessão de coleta</dt>
                  <dd>
                    {row.estado_sessao === 'aberta'
                      ? 'Aberta'
                      : row.estado_sessao === 'encerrada'
                        ? 'Última encerrada'
                        : 'Sem sessão registrada'}
                  </dd>
                </div>
              </dl>
              {row.sessao_coleta && (
                <div className="coleta-fronteira">
                  <span>Coletar desde</span>
                  <p>
                    <time dateTime={row.sessao_coleta.coletar_desde}>
                      {coletaDate(row.sessao_coleta.coletar_desde)}
                    </time>
                  </p>
                  <details>
                    <summary>Instante original da fronteira</summary>
                    <code>{row.sessao_coleta.coletar_desde}</code>
                  </details>
                  <p>Reconectar ou retomar não amplia este limite.</p>
                </div>
              )}
              <details className="coleta-detalhes">
                <summary>Datas e identificação</summary>
                <dl className="coleta-dados">
                  {(
                    [
                      'criado_em',
                      'pareado_em',
                      'rotacionado_em',
                      'expira_em',
                      'revogado_em',
                    ] as const
                  ).map((key, index) => (
                    <div key={key}>
                      <dt>
                        {
                          [
                            'Criado em',
                            'Pareado em',
                            'Credencial trocada em',
                            'Expiração registrada',
                            'Revogado em',
                          ][index]
                        }
                      </dt>
                      <dd>{coletaDate(row[key])}</dd>
                    </div>
                  ))}
                  {row.sessao_coleta && (
                    <>
                      <div>
                        <dt>Sessão criada em</dt>
                        <dd>{coletaDate(row.sessao_coleta.criada_em)}</dd>
                      </div>
                      <div>
                        <dt>Sessão encerrada em</dt>
                        <dd>{coletaDate(row.sessao_coleta.encerrada_em)}</dd>
                      </div>
                    </>
                  )}
                  <div>
                    <dt>Identificação pública</dt>
                    <dd className="numero">{row.instalacao_publica_id}</dd>
                  </div>
                </dl>
              </details>
              <div className="acoes">
                <button
                  type="button"
                  disabled={
                    blocked || !!row.revogado_em || !access?.can(ROTATE)
                  }
                  onClick={(event) =>
                    void ask('rotate', row, event.currentTarget)
                  }
                >
                  Trocar credencial
                </button>
                <button
                  type="button"
                  disabled={
                    blocked || !!row.revogado_em || !access?.can(REVOKE)
                  }
                  onClick={(event) =>
                    void ask('revoke', row, event.currentTarget)
                  }
                >
                  Revogar acesso
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
      <aside className="coleta-nota">
        <h2>Do envio à aposta</h2>
        <p>
          Um envio aceito pela coleta ainda pode estar em processamento ou
          precisar de Revisão. Confira o registro em Apostas. Captura,
          permissões do navegador e fila de envios são administradas pela
          extensão.
        </p>
        <div className="acoes">
          <Link to={`/${location.search}`}>Ver Apostas</Link>
          <Link to={`/revisao${location.search}`}>Ver Revisão</Link>
        </div>
      </aside>
    </main>
  );
}

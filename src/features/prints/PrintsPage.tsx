import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/ProvedorAuth';
import { useAcesso } from '../acesso/ProvedorAcesso';
import { getApiClient } from '../../api/client';
import { ApiError } from '../../api/error';
import { ErroApi } from '../../components/ErroApi';
import { atrasoConsulta, retryConsulta } from '../../app/queryClient';
import { decimal } from '../../lib/format';
import { useRetryAfter } from '../../lib/useRetryAfter';
import {
  PRINT_PATH,
  RETRY_PATH,
  INTENT_PATH,
  PRINT_STATUS,
  PRINT_OUTCOME,
  printAddress,
  validateFiles,
  validateItem,
  validateIntent,
  type PrintItem,
} from './model';
import './prints.css';

type Row = {
  id: string;
  file?: File;
  preview?: string;
  hash?: string;
  repeated?: boolean;
  remote?: PrintItem;
  phase:
    'selected' | 'sending' | 'rejected' | 'unknown' | 'absent' | 'received';
  error?: unknown;
  confirmed?: boolean;
};

export function PrintsPage() {
  const auth = useAuth();
  const access = useAcesso();
  const location = useLocation();
  const navigate = useNavigate();
  const address = printAddress(new URLSearchParams(location.search));
  const itemKey = address.items.join(',');
  const [rows, setRows] = useState<Row[]>(() =>
    address.items.map((id) => ({ id, phase: 'unknown' })),
  );
  const latest = useRef(rows);
  useEffect(() => {
    latest.current = rows;
  }, [rows]);
  const [selectionError, setSelectionError] = useState('');
  const [readError, setReadError] = useState<unknown>();
  const [busy, setBusy] = useState(false);
  const [selecting, setSelecting] = useState(false);
  const [checking, setChecking] = useState(false);
  const [paused, setPaused] = useState(false);
  const [limit, setLimit] = useState(false);
  const [tick, setTick] = useState(0);
  const [writeError, setWriteError] = useState<unknown>();
  const waiting = useRetryAfter(writeError);
  const readWaiting = useRetryAfter(readError);
  const input = useRef<HTMLInputElement>(null);
  const active = useRef(true);
  const requests = useRef(new Set<AbortController>());
  const urls = useRef(new Set<string>());
  const writeLock = useRef(false);
  const selectLock = useRef(false);
  const readLock = useRef(false);
  const epoch = auth?.state.privateEpoch;
  const service = auth?.service;
  const intentRef = useRef(address.intent);
  const ownedIntent = useRef(address.intent);
  useEffect(() => {
    intentRef.current = address.intent;
  }, [address.intent]);
  const update = (id: string, values: Partial<Row>) =>
    setRows((old) =>
      old.map((row) => (row.id === id ? { ...row, ...values } : row)),
    );
  const current = (privateEpoch: number | undefined, signal?: AbortSignal) =>
    active.current &&
    !signal?.aborted &&
    service?.getSnapshot().privateEpoch === privateEpoch;

  useEffect(() => {
    active.current = true;
    const clear = () => {
      requests.current.forEach((request) => request.abort());
      urls.current.forEach((url) => URL.revokeObjectURL(url));
      urls.current.clear();
      latest.current = [];
      setRows([]);
      setReadError(undefined);
      setWriteError(undefined);
      if (input.current) input.current.value = '';
    };
    const unregister = service?.registerCleanup(clear);
    return () => {
      active.current = false;
      clear();
      unregister?.();
    };
  }, [service, epoch]);

  useEffect(() => {
    if (ownedIntent.current === address.intent) return;
    ownedIntent.current = address.intent;
    requests.current.forEach((request) => request.abort());
    urls.current.forEach((url) => URL.revokeObjectURL(url));
    urls.current.clear();
    const restored = (itemKey ? itemKey.split(',') : []).map((id): Row => ({
      id,
      phase: 'unknown',
    }));
    latest.current = restored;
    setRows(restored);
    setReadError(undefined);
    setWriteError(undefined);
    setPaused(false);
    setLimit(false);
  }, [address.intent, itemKey]);

  function saveAddress(intent: string, ids: string[]) {
    const params = new URLSearchParams(location.search);
    params.set('entrada', 'prints');
    params.set('prints', intent);
    params.delete('item');
    ids.forEach((id) => params.append('item', id));
    void navigate(
      {
        pathname: location.pathname,
        search: params.toString(),
        hash: location.hash,
      },
      { replace: true },
    );
  }

  async function select(files: File[]) {
    if (selectLock.current || writeLock.current || address.invalid) return;
    const error = validateFiles(
      files,
      latest.current.flatMap((row) => (row.file ? [row.file] : [])),
    );
    if (error || files.length + latest.current.length > 20) {
      setSelectionError(
        error || 'Este envio já tem 20 prints. Inicie outro envio.',
      );
      return;
    }
    selectLock.current = true;
    setSelecting(true);
    setSelectionError('');
    const capturedEpoch = service?.getSnapshot().privateEpoch;
    try {
      const additions: Row[] = [];
      for (const file of files) {
        const bytes = await file.arrayBuffer();
        const digest = await crypto.subtle.digest('SHA-256', bytes);
        if (!current(capturedEpoch)) return;
        const hash = Array.from(new Uint8Array(digest), (byte) =>
          byte.toString(16).padStart(2, '0'),
        ).join('');
        const preview = URL.createObjectURL(file);
        urls.current.add(preview);
        additions.push({
          id: crypto.randomUUID(),
          file,
          preview,
          hash,
          repeated: [...latest.current, ...additions].some(
            (row) => row.hash === hash,
          ),
          phase: 'selected',
        });
      }
      const next = [...latest.current, ...additions];
      setRows(next);
      latest.current = next;
      const intent = address.intent ?? crypto.randomUUID();
      ownedIntent.current = intent;
      intentRef.current = intent;
      saveAddress(
        intent,
        next.map((row) => row.id),
      );
    } catch {
      if (current(capturedEpoch))
        setSelectionError(
          'Não foi possível preparar as imagens. Escolha os arquivos novamente.',
        );
    } finally {
      selectLock.current = false;
      if (active.current) setSelecting(false);
      if (input.current) input.current.value = '';
    }
  }

  async function readItem(row: Row) {
    const intent = intentRef.current;
    if (
      !service ||
      !intent ||
      writeLock.current ||
      readLock.current ||
      readWaiting
    )
      return;
    readLock.current = true;
    setChecking(true);
    const capturedEpoch = service.getSnapshot().privateEpoch;
    const controller = new AbortController();
    requests.current.add(controller);
    try {
      const remote = await service.read(async () => {
        const result = await getApiClient().GET(PRINT_PATH, {
          params: { path: { intent_id: intent, item_id: row.id } },
          signal: controller.signal,
        });
        return validateItem(result.data, intent, row.id);
      });
      if (current(capturedEpoch, controller.signal)) {
        setReadError(undefined);
        update(row.id, {
          remote,
          phase: 'received',
          error: undefined,
          confirmed: true,
        });
        setTick((value) => value + 1);
      }
    } catch (error) {
      if (current(capturedEpoch, controller.signal)) {
        if (!(error instanceof ApiError && error.status === 404))
          setReadError(error);
        update(row.id, {
          phase:
            error instanceof ApiError && error.status === 404
              ? 'absent'
              : 'unknown',
          error,
          confirmed: error instanceof ApiError && error.status === 404,
        });
      }
    } finally {
      requests.current.delete(controller);
      readLock.current = false;
      if (active.current) setChecking(false);
    }
  }

  async function sendRow(row: Row, retry = false) {
    const intent = intentRef.current;
    if (
      !service ||
      !access ||
      !intent ||
      !access.can(`POST ${retry ? RETRY_PATH : PRINT_PATH}`)
    )
      return false;
    const scope = service.capture();
    if (!scope?.isCurrent()) return false;
    const capturedEpoch = service.getSnapshot().privateEpoch;
    const controller = new AbortController();
    requests.current.add(controller);
    update(row.id, { phase: 'sending', error: undefined, confirmed: false });
    try {
      const result = retry
        ? await access.run(`POST ${RETRY_PATH}`, () =>
            getApiClient().POST(RETRY_PATH, {
              params: { path: { intent_id: intent, item_id: row.id } },
              body: {
                retry_id: crypto.randomUUID(),
                expected_attempt: row.remote!.attempt,
              },
              signal: controller.signal,
            }),
          )
        : await access.run(`POST ${PRINT_PATH}`, () =>
            getApiClient().POST(PRINT_PATH, {
              params: { path: { intent_id: intent, item_id: row.id } },
              body: { file: row.file!.name },
              bodySerializer: () => {
                const form = new FormData();
                form.append('file', row.file!);
                return form;
              },
              signal: controller.signal,
            }),
          );
      if (!current(capturedEpoch, controller.signal)) return false;
      if (!scope.isCurrent())
        throw new ApiError('cancelled', { mutation: true });
      if (result.response.status !== 202)
        throw new ApiError('invalid_response', { mutation: true });
      let remote: PrintItem;
      try {
        remote = validateItem(result.data, intent, row.id);
      } catch {
        throw new ApiError('invalid_response', { mutation: true });
      }
      update(row.id, { remote, phase: 'received', error: undefined });
      setTick((value) => value + 1);
      return true;
    } catch (cause) {
      if (!current(capturedEpoch, controller.signal)) return false;
      const error = !scope.isCurrent()
        ? new ApiError('cancelled', { mutation: true })
        : cause instanceof ApiError
          ? cause
          : new ApiError('invalid_response', { mutation: true });
      update(row.id, {
        phase:
          error.outcomeUnknown || [409, 410].includes(error.status)
            ? 'unknown'
            : 'rejected',
        error,
        confirmed: false,
      });
      setWriteError(error);
      return !error.outcomeUnknown && [400, 413, 422].includes(error.status);
    } finally {
      requests.current.delete(controller);
    }
  }

  async function send(rowsToSend: Row[], retry = false) {
    if (
      writeLock.current ||
      readLock.current ||
      selectLock.current ||
      waiting ||
      address.invalid ||
      !rowsToSend.length
    )
      return;
    writeLock.current = true;
    setBusy(true);
    setWriteError(undefined);
    try {
      for (const row of rowsToSend) if (!(await sendRow(row, retry))) break;
    } finally {
      writeLock.current = false;
      if (active.current) setBusy(false);
    }
  }

  useEffect(() => {
    if (!address.intent || !service || paused || limit || address.invalid)
      return;
    let stopped = false,
      count = 0,
      failures = 0;
    const began = Date.now();
    let timer: ReturnType<typeof setTimeout>;
    const controller = new AbortController();
    const ownedRequests = requests.current;
    ownedRequests.add(controller);
    const capturedEpoch = service.getSnapshot().privateEpoch;
    const intent = address.intent;
    const read = async () => {
      if (stopped || Date.now() - began >= 15 * 60_000 || count++ >= 300) {
        if (!stopped) setLimit(true);
        return;
      }
      try {
        const result = await service.read(async () => {
          const response = await getApiClient().GET(INTENT_PATH, {
            params: { path: { intent_id: intent } },
            signal: controller.signal,
          });
          return validateIntent(response.data, intent);
        });
        if (
          stopped ||
          !active.current ||
          controller.signal.aborted ||
          service.getSnapshot().privateEpoch !== capturedEpoch
        )
          return;
        failures = 0;
        setReadError(undefined);
        setRows((old) => {
          const known = old.map((row) => {
            const remote = result.items.find((item) => item.item_id === row.id);
            return remote
              ? { ...row, remote, phase: 'received' as const, error: undefined }
              : row;
          });
          return [
            ...known,
            ...result.items
              .filter((item) => !known.some((row) => row.id === item.item_id))
              .map((remote) => ({
                id: remote.item_id,
                remote,
                phase: 'received' as const,
              })),
          ];
        });
        if (
          result.items.some(
            (item) =>
              item.status === 'accepted' || item.status === 'processing',
          )
        )
          timer = setTimeout(
            () => void read(),
            Math.min(1000 * 2 ** Math.min(count - 1, 5), 30_000),
          );
      } catch (error) {
        if (
          stopped ||
          !active.current ||
          controller.signal.aborted ||
          service.getSnapshot().privateEpoch !== capturedEpoch
        )
          return;
        // A newly selected intention may not have admitted any file yet.
        if (error instanceof ApiError && error.status === 404) return;
        setReadError(error);
        if (retryConsulta(failures, error))
          timer = setTimeout(
            () => void read(),
            atrasoConsulta(failures++, error),
          );
      }
    };
    void read();
    return () => {
      stopped = true;
      clearTimeout(timer);
      controller.abort();
      ownedRequests.delete(controller);
    };
    // Location identifiers and explicit observation control own this finite GET scheduler.
  }, [address.intent, address.invalid, service, epoch, paused, limit, tick]);

  function remove(row: Row) {
    if (row.preview) {
      URL.revokeObjectURL(row.preview);
      urls.current.delete(row.preview);
    }
    const next = latest.current.filter((item) => item.id !== row.id);
    setRows(next);
    latest.current = next;
    if (address.intent)
      saveAddress(
        address.intent,
        next.map((item) => item.id),
      );
  }
  function newIntent() {
    if (busy || selecting) return;
    urls.current.forEach((url) => URL.revokeObjectURL(url));
    urls.current.clear();
    setRows([]);
    latest.current = [];
    setSelectionError('');
    setReadError(undefined);
    setWriteError(undefined);
    setPaused(false);
    setLimit(false);
    const params = new URLSearchParams(location.search);
    params.delete('prints');
    params.delete('item');
    void navigate({
      pathname: location.pathname,
      search: params.toString(),
      hash: location.hash,
    });
    input.current?.focus();
  }
  const selected = rows.filter((row) => row.phase === 'selected');
  return (
    <section className="prints-pagina" aria-labelledby="prints-titulo">
      <h2 id="prints-titulo">Enviar prints</h2>
      <p>
        Escolha as imagens dos bilhetes. Você acompanha o resultado de cada
        print aqui.
      </p>
      {address.invalid ? (
        <section className="enviar-painel">
          <h3>Não foi possível identificar este envio</h3>
          <p>O endereço está inválido. Nenhum print foi enviado novamente.</p>
          <button onClick={newIntent}>Escolher novos prints</button>
        </section>
      ) : (
        <>
          <section
            className="prints-selecao enviar-painel"
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              void select(Array.from(event.dataTransfer.files));
            }}
            aria-label="Seleção de prints"
          >
            <label htmlFor="prints-arquivos">Imagens dos bilhetes</label>
            <p id="prints-ajuda">
              JPEG, PNG, GIF ou WebP. Até 20 imagens, 20 MiB por imagem e 100
              MiB por envio.
            </p>
            <div className="enviar-seletor">
              <span aria-hidden="true">Escolher imagens</span>
              <input
                ref={input}
                id="prints-arquivos"
                type="file"
                multiple
                accept="image/jpeg,image/png,image/gif,image/webp"
                disabled={busy || selecting || rows.length >= 20}
                aria-describedby="prints-ajuda"
                onChange={(event) =>
                  void select(Array.from(event.target.files ?? []))
                }
              />
            </div>
            <p className="texto-secundario">
              Você também pode arrastar as imagens para esta área. Selecionar
              não envia.
            </p>
            {selectionError && <p role="alert">{selectionError}</p>}
            {selecting && <p role="status">Preparando imagens…</p>}
            {!rows.length && (
              <p>
                Nenhum print escolhido. Comece selecionando as imagens dos
                bilhetes.
              </p>
            )}
            <button
              className="enviar-principal"
              disabled={
                !selected.length ||
                busy ||
                selecting ||
                waiting ||
                !access?.can(`POST ${PRINT_PATH}`)
              }
              onClick={() => void send(selected)}
            >
              {busy ? 'Enviando prints…' : 'Enviar prints selecionados'}
            </button>
            {waiting && (
              <p role="status">
                Aguarde o prazo informado pelo serviço antes de enviar
                novamente.
              </p>
            )}
            {!access?.can(`POST ${PRINT_PATH}`) && (
              <p>
                Sua conta permite consultar envios. Confira a assinatura para
                voltar a enviar prints.
              </p>
            )}
          </section>
          {!!rows.length && (
            <>
              <p className="prints-nota">
                Cada arquivo tem seu próprio resultado. Pausar ou sair desta
                página não cancela o processamento. O endereço permite voltar a
                consultar; as imagens escolhidas ficam somente nesta página.
              </p>
              <ul className="prints-lista">
                {rows.map((row, index) => (
                  <li key={row.id} className="prints-item">
                    <div className="prints-miniatura">
                      {row.preview ? (
                        <img
                          src={row.preview}
                          alt={`Prévia de ${row.file?.name}`}
                          width={120}
                          height={90}
                          loading="lazy"
                          onError={(event) => {
                            event.currentTarget.hidden = true;
                          }}
                        />
                      ) : (
                        <span>Print {index + 1}</span>
                      )}
                    </div>
                    <div className="prints-dados">
                      <h3>{row.file?.name ?? `Print ${index + 1}`}</h3>
                      <p role="status">
                        {row.phase === 'sending'
                          ? 'Enviando arquivo…'
                          : row.phase === 'unknown'
                            ? 'Confira se o print foi recebido'
                            : row.phase === 'absent'
                              ? 'Recebimento não encontrado'
                              : row.phase === 'rejected'
                                ? 'Arquivo não aceito'
                                : row.remote
                                  ? row.remote.outcome
                                    ? PRINT_OUTCOME[row.remote.outcome]
                                    : PRINT_STATUS[row.remote.status]
                                  : 'Pronto para enviar'}
                      </p>
                      {row.repeated && (
                        <p>
                          Imagem repetida na seleção. O serviço confirma se já
                          foi recebida.
                        </p>
                      )}
                      {row.remote?.duplicate && (
                        <p>
                          O serviço identificou uma imagem já recebida. Ela
                          acompanha o mesmo processamento.
                        </p>
                      )}
                      {row.remote && (
                        <>
                          <label htmlFor={`progresso-${row.id}`}>
                            Progresso{' '}
                            {row.remote.progress_percent === null
                              ? 'não informado'
                              : `${decimal(row.remote.progress_percent)}%`}
                          </label>
                          <progress
                            id={`progresso-${row.id}`}
                            max={100}
                            value={row.remote.progress_percent ?? undefined}
                          />
                          {row.remote.results === null ? (
                            <p>O resultado ainda não foi informado.</p>
                          ) : row.remote.results.length === 0 ? (
                            <p>A leitura terminou sem registrar apostas.</p>
                          ) : (
                            <ul>
                              {row.remote.results.map((result, resultIndex) => (
                                <li key={resultIndex}>
                                  {result.bet_key && (
                                    <Link
                                      to={`/aposta/${encodeURIComponent(result.bet_key)}${location.search}`}
                                    >
                                      Ver aposta {resultIndex + 1}
                                    </Link>
                                  )}
                                  {result.review_ids.length > 0 && (
                                    <Link to={`/revisao${location.search}`}>
                                      Abrir Revisão
                                    </Link>
                                  )}
                                </li>
                              ))}
                            </ul>
                          )}
                        </>
                      )}
                      {!!row.error && (
                        <ErroApi
                          contexto={`Print ${index + 1}`}
                          error={row.error}
                          intent={
                            row.phase === 'unknown' || row.phase === 'rejected'
                              ? 'gravacao'
                              : 'leitura'
                          }
                          destination={location.pathname + location.search}
                          actions={{ conferir: () => void readItem(row) }}
                        />
                      )}
                      {row.phase === 'unknown' && (
                        <p>
                          Consulte esta identidade antes de tentar outra vez.
                          Nenhum arquivo será reenviado automaticamente.
                        </p>
                      )}
                      {row.phase === 'absent' && (
                        <p>
                          A consulta não encontrou a admissão.{' '}
                          {row.file
                            ? 'Você pode tentar este arquivo explicitamente, mantendo a mesma identidade.'
                            : 'As imagens locais não são guardadas. Escolha novos prints; o serviço verifica a duplicação.'}
                        </p>
                      )}
                      <div className="acoes">
                        {(row.phase === 'unknown' ||
                          row.phase === 'absent' ||
                          row.phase === 'rejected') && (
                          <button
                            disabled={busy || checking || readWaiting}
                            onClick={() => void readItem(row)}
                          >
                            Conferir print {index + 1}
                          </button>
                        )}
                        {row.file &&
                          (row.phase === 'absent' ||
                            row.phase === 'rejected') &&
                          row.confirmed &&
                          !(
                            row.error instanceof ApiError &&
                            [409, 410].includes(row.error.status)
                          ) && (
                            <button
                              disabled={
                                busy ||
                                waiting ||
                                !access?.can(`POST ${PRINT_PATH}`)
                              }
                              onClick={() => void send([row])}
                            >
                              Tentar envio do print {index + 1}
                            </button>
                          )}
                        {row.remote?.status === 'failed' &&
                          row.remote.retryable &&
                          row.phase === 'received' && (
                            <button
                              disabled={
                                busy ||
                                waiting ||
                                !access?.can(`POST ${RETRY_PATH}`)
                              }
                              onClick={() => void send([row], true)}
                            >
                              Tentar processamento do print {index + 1}
                            </button>
                          )}
                        {['selected', 'rejected', 'absent'].includes(
                          row.phase,
                        ) && (
                          <button disabled={busy} onClick={() => remove(row)}>
                            Remover print {index + 1} da seleção
                          </button>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
              <div className="acoes">
                <button
                  disabled={busy || readWaiting}
                  onClick={() => {
                    setPaused(paused || limit ? false : true);
                    setLimit(false);
                    setTick((value) => value + 1);
                  }}
                >
                  {paused || limit
                    ? 'Continuar acompanhamento'
                    : 'Pausar acompanhamento'}
                </button>
                <button disabled={busy} onClick={newIntent}>
                  Escolher novos prints
                </button>
              </div>
              {(paused || limit) && (
                <p role="status">
                  Acompanhamento pausado. Os prints recebidos continuam sendo
                  processados.
                </p>
              )}
            </>
          )}
          {!!readError && (
            <ErroApi
              contexto="Acompanhamento dos prints"
              error={readError}
              intent="leitura"
              actions={{
                tentar: () => {
                  setLimit(false);
                  setTick((value) => value + 1);
                },
              }}
            />
          )}
        </>
      )}
    </section>
  );
}

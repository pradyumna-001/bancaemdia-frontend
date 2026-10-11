import { useEffect, useRef, useState, type FormEvent } from 'react';
import {
  Link,
  useLocation,
  useNavigate,
  useSearchParams,
} from 'react-router-dom';
import { getApiClient } from '../../api/client';
import { ApiError } from '../../api/error';
import { useAuth } from '../../auth/ProvedorAuth';
import { useAcesso } from '../acesso/ProvedorAcesso';
import { ErroApi } from '../../components/ErroApi';
import { decimal } from '../../lib/format';
import { useRetryAfter } from '../../lib/useRetryAfter';
import { jobIdValido } from './job';
import { useJob } from './useJob';
import './enviar.css';

const RESULTADOS = {
  completo: 'Importação concluída',
  parcial: 'Importação concluída com pendências',
  vazio: 'Nenhuma aposta foi importada',
  falha: 'O processamento não foi concluído',
};

export function EnviarPage() {
  const auth = useAuth();
  const access = useAcesso();
  const location = useLocation();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const latestLocation = useRef(location);
  useEffect(() => {
    latestLocation.current = location;
  }, [location]);
  const ids = params.getAll('envio');
  const id = ids.length === 1 ? jobIdValido(ids[0]) : undefined;
  const invalid = ids.length > 0 && !id;
  const [file, setFile] = useState<File>();
  const [validation, setValidation] = useState('');
  const [error, setError] = useState<unknown>();
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(false);
  const [total, setTotal] = useState<number>();
  const [checkError, setCheckError] = useState<unknown>();
  const [paused, setPaused] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const upload = useRef<AbortController>();
  const reading = useRef<AbortController>();
  const alive = useRef(false);
  const waiting = useRetryAfter(error);
  const unknown = error instanceof ApiError && error.outcomeUnknown;
  const readOnly = error instanceof ApiError && error.status === 402;

  useEffect(() => {
    alive.current = true;
    const clear = () => {
      upload.current?.abort();
      reading.current?.abort();
      setFile(undefined);
      if (input.current) input.current.value = '';
      setError(undefined);
      setTotal(undefined);
      setCheckError(undefined);
    };
    const unregister = auth?.service.registerCleanup(clear);
    return () => {
      alive.current = false;
      upload.current?.abort();
      reading.current?.abort();
      unregister?.();
    };
  }, [auth?.service]);

  // Pausing unsubscribes the GET observer. The remote job keeps running.
  const observed = useJob(paused ? undefined : id);
  const current = paused ? undefined : observed;
  const jobWaiting = useRetryAfter(current?.erro);

  function changeJob(next?: string) {
    const currentLocation = latestLocation.current;
    const copy = new URLSearchParams(currentLocation.search);
    copy.delete('envio');
    if (next) copy.set('envio', next);
    void navigate({
      pathname: currentLocation.pathname,
      search: copy.toString(),
      hash: currentLocation.hash,
    });
    setPaused(false);
  }

  async function send(event: FormEvent) {
    event.preventDefault();
    if (
      !file ||
      upload.current ||
      waiting ||
      unknown ||
      readOnly ||
      !access?.can('POST /api/v1/upload') ||
      id ||
      invalid
    )
      return;
    const service = auth?.service;
    if (!service || service.getSnapshot().phase !== 'authenticated') return;
    const scope = service.capture();
    if (!scope?.isCurrent()) return;
    const epoch = service.getSnapshot().privateEpoch;
    const samePrivateContext = () =>
      alive.current && service.getSnapshot().privateEpoch === epoch;
    const controller = new AbortController();
    upload.current = controller;
    setBusy(true);
    setError(undefined);
    try {
      const result = await access.run('POST /api/v1/upload', () =>
        getApiClient().POST('/api/v1/upload', {
          body: { file: file.name },
          bodySerializer: () => {
            const form = new FormData();
            form.append('file', file);
            return form;
          },
          signal: controller.signal,
        }),
      );
      if (!samePrivateContext() || controller.signal.aborted) return;
      if (!scope.isCurrent()) {
        setError(new ApiError('cancelled', { mutation: true }));
        return;
      }
      const accepted =
        result.response.status === 202 && jobIdValido(result.data?.job_id);
      if (!accepted) throw new ApiError('invalid_response', { mutation: true });
      changeJob(accepted);
      setFile(undefined);
      if (input.current) input.current.value = '';
    } catch (cause) {
      if (samePrivateContext() && !controller.signal.aborted)
        setError(
          !scope.isCurrent()
            ? new ApiError('cancelled', { mutation: true })
            : cause instanceof ApiError
              ? cause
              : new ApiError('invalid_response', { mutation: true }),
        );
    } finally {
      if (upload.current === controller) upload.current = undefined;
      if (alive.current) setBusy(false);
    }
  }

  async function checkResult() {
    if (reading.current) return;
    const service = auth?.service;
    if (!service || service.getSnapshot().phase !== 'authenticated') return;
    const scope = service.capture();
    if (!scope?.isCurrent()) return;
    const epoch = service.getSnapshot().privateEpoch;
    const samePrivateContext = () =>
      alive.current && service.getSnapshot().privateEpoch === epoch;
    const controller = new AbortController();
    reading.current = controller;
    setChecking(true);
    setCheckError(undefined);
    try {
      const result = await service.read(async () => {
        const { data } = await getApiClient().GET('/api/v1/apostas', {
          params: { query: { page: 1, page_size: 1, incluir_apagadas: true } },
          signal: controller.signal,
        });
        if (
          !data ||
          !Number.isSafeInteger(data.pagination.total) ||
          data.pagination.total < 0
        )
          throw new ApiError('invalid_response');
        return data.pagination.total;
      });
      if (samePrivateContext() && !controller.signal.aborted) setTotal(result);
    } catch (cause) {
      if (samePrivateContext() && !controller.signal.aborted)
        setCheckError(cause);
    } finally {
      if (reading.current === controller) reading.current = undefined;
      if (alive.current) setChecking(false);
    }
  }

  function newIntent() {
    setValidation('');
    setFile(undefined);
    if (input.current) input.current.value = '';
    setError(undefined);
    setTotal(undefined);
    setCheckError(undefined);
    changeJob();
    input.current?.focus();
  }

  return (
    <main className="pagina pagina-interna enviar-pagina">
      <h1>Enviar</h1>
      <p>Importe suas apostas a partir de um export do Telegram.</p>
      {invalid && (
        <section
          className="enviar-painel"
          aria-label="Acompanhamento indisponível"
        >
          <h2>Não foi possível identificar o envio</h2>
          <p>
            O endereço de acompanhamento está incompleto ou inválido. Nenhum
            arquivo foi reenviado.
          </p>
          <button type="button" onClick={newIntent}>
            Escolher outro arquivo
          </button>
        </section>
      )}
      {id && (
        <section className="enviar-painel" aria-label="Acompanhamento do envio">
          <h2 aria-live="polite">
            {current?.resultado
              ? RESULTADOS[current.resultado]
              : paused
                ? 'Acompanhamento pausado'
                : current?.fase === 'interrompido'
                  ? 'Acompanhamento interrompido'
                  : (current?.etapa ?? 'Consultando envio…')}
          </h2>
          <p>
            Fechar esta página ou pausar o acompanhamento não cancela o
            processamento. O endereço desta página permite voltar a acompanhar.
          </p>
          {current?.dados && (
            <>
              <label htmlFor="enviar-progresso">
                Progresso{' '}
                {current.dados.progress.percent == null
                  ? 'não informado'
                  : `${decimal(current.dados.progress.percent)}%`}
              </label>
              <progress
                id="enviar-progresso"
                max={100}
                value={current.dados.progress.percent}
              />
              <dl className="enviar-contagens">
                {[
                  ['Apostas importadas', current.dados.bets_processed],
                  ['Apostas com falha', current.dados.bets_failed],
                  ['Bilhetes lidos', current.dados.progress.read],
                  ['Bilhetes com falha', current.dados.progress.failed],
                  ['Bilhetes ignorados', current.dados.progress.ignored],
                  [
                    'Bilhetes acima do limite',
                    current.dados.progress.over_limit,
                  ],
                  ['Bilhetes pendentes', current.dados.progress.pending],
                ].map(([label, count]) => (
                  <div key={label}>
                    <dt>{label}</dt>
                    <dd className="numero">{decimal(count as number)}</dd>
                  </div>
                ))}
              </dl>
            </>
          )}
          {current?.resultado === 'vazio' && (
            <p>
              O arquivo foi processado, mas não gerou apostas. Confira se o
              export contém as fotos dos bilhetes e se elas já foram importadas.
            </p>
          )}
          {current?.resultado === 'parcial' && (
            <p>
              As apostas importadas foram preservadas. Alguns bilhetes falharam
              ou ficaram acima do limite. Confira o export antes de iniciar
              outro envio.
            </p>
          )}
          {current?.resultado === 'falha' && (
            <p>
              Alguns registros podem ter sido importados antes da falha. Confira
              o resultado antes de escolher outro arquivo.
            </p>
          )}
          {current?.erro && (
            <ErroApi
              error={current.erro}
              intent="leitura"
              actions={{ tentar: () => current.retomar() }}
            />
          )}
          {current?.motivo === 'limite' && (
            <p>
              O acompanhamento automático terminou. Você pode continuar a
              consulta; o arquivo não será reenviado.
            </p>
          )}
          <div className="acoes">
            {paused ? (
              <button type="button" onClick={() => setPaused(false)}>
                Continuar acompanhamento
              </button>
            ) : current?.fase === 'observando' ||
              current?.fase === 'inativo' ? (
              <button type="button" onClick={() => setPaused(true)}>
                Pausar acompanhamento
              </button>
            ) : current?.motivo === 'limite' ? (
              <button
                type="button"
                disabled={jobWaiting}
                onClick={() => current.retomar()}
              >
                Continuar acompanhamento
              </button>
            ) : null}
            {current?.resultado && (
              <button type="button" onClick={newIntent}>
                Escolher outro arquivo
              </button>
            )}
            {current?.erro && [403, 404, 405].includes(current.erro.status) && (
              <button type="button" onClick={newIntent}>
                Escolher outro arquivo
              </button>
            )}
          </div>
        </section>
      )}
      {!id && !invalid && (
        <section className="enviar-painel" aria-labelledby="enviar-titulo">
          <h2 id="enviar-titulo">Importar export do Telegram</h2>
          <form onSubmit={(event) => void send(event)}>
            <label htmlFor="enviar-arquivo">Arquivo do export</label>
            <p id="enviar-ajuda">
              Escolha um ZIP com result.json e as fotos, ou o arquivo
              result.json. O JSON sozinho não inclui as fotos armazenadas em
              outros arquivos.
            </p>
            <div className="enviar-seletor">
              <span aria-hidden="true">Escolher arquivo</span>
              <input
                ref={input}
                id="enviar-arquivo"
                type="file"
                accept=".zip,.json"
                disabled={busy || unknown}
                aria-describedby="enviar-ajuda enviar-validacao"
                aria-invalid={!!validation}
                onChange={(event) => {
                  const selected = event.target.files?.[0];
                  const invalidFile =
                    selected &&
                    (!/\.(zip|json)$/i.test(selected.name) ||
                      selected.size === 0);
                  setFile(invalidFile ? undefined : selected);
                  setValidation(
                    invalidFile
                      ? 'Escolha um arquivo ZIP ou JSON que não esteja vazio.'
                      : '',
                  );
                }}
              />
            </div>
            <p id="enviar-validacao" role={validation ? 'alert' : undefined}>
              {validation}
            </p>
            {file && (
              <p className="enviar-nome">Arquivo escolhido: {file.name}</p>
            )}
            <button
              className="enviar-principal"
              type="submit"
              disabled={
                !file ||
                busy ||
                waiting ||
                unknown ||
                readOnly ||
                !access?.can('POST /api/v1/upload')
              }
            >
              {busy ? 'Enviando arquivo…' : 'Enviar export'}
            </button>
            {busy && (
              <p role="status">
                Enviando o arquivo. Aguarde a confirmação do serviço.
              </p>
            )}
            {waiting && (
              <p role="status">
                Aguarde o prazo informado pelo serviço antes de enviar
                novamente.
              </p>
            )}
            {!!error && (
              <ErroApi
                error={error}
                intent="gravacao"
                destination={
                  location.pathname + location.search + location.hash
                }
                fields={[
                  {
                    scope: 'body',
                    field: 'file',
                    id: 'enviar-arquivo',
                    label: 'o arquivo do export',
                  },
                ]}
                actions={{
                  revisar: () => input.current?.focus(),
                  conferir: () => void checkResult(),
                }}
              />
            )}
            {unknown && (
              <p>
                Sem o endereço de acompanhamento, o serviço não permite
                identificar este envio. Consultar as apostas não confirma se
                este arquivo foi processado. Não repita o envio para testar.
              </p>
            )}
            {unknown && total != null && (
              <button type="button" onClick={newIntent}>
                Iniciar um novo envio
              </button>
            )}
          </form>
        </section>
      )}
      {checking && (
        <p role="status">Consultando apostas, sem reenviar arquivo…</p>
      )}
      {total != null && (
        <p role="status">
          Consulta atualizada: <span className="numero">{decimal(total)}</span>{' '}
          apostas na conta, incluindo apagadas e sem filtros. Esse total não
          confirma quais vieram deste envio.
        </p>
      )}
      {!!checkError && (
        <ErroApi
          error={checkError}
          intent="leitura"
          actions={{ tentar: () => void checkResult() }}
        />
      )}
      {current?.resultado === 'falha' && (
        <button
          type="button"
          disabled={checking}
          onClick={() => void checkResult()}
        >
          Conferir resultado
        </button>
      )}
      <details className="enviar-painel">
        <summary>Como preparar o export</summary>
        <ol>
          <li>
            No Telegram Desktop, abra a conversa e use o menu de três pontos
            para exportar o histórico.
          </li>
          <li>Escolha o formato JSON e inclua as fotos dos bilhetes.</li>
          <li>
            Compacte result.json junto com a pasta das fotos em um ZIP, mantendo
            os nomes e as pastas do export.
          </li>
          <li>
            Escolha o ZIP aqui. No celular, você pode selecionar o arquivo já
            preparado no computador.
          </li>
        </ol>
        <p>
          O serviço confere formato, tamanho e limites. Após um envio aceito,
          aguarde pelo menos cinco minutos para iniciar outro. Bilhetes
          ignorados podem incluir fotos ausentes ou já importadas.
        </p>
        <a
          href="https://telegram.org/blog/export-and-more"
          target="_blank"
          rel="noopener noreferrer"
        >
          Ajuda oficial do Telegram (em outra aba)
        </a>
      </details>
      <p className="enviar-outros">
        Este envio importa o histórico do Telegram. Para enviar uma foto pelo
        bot,
        <Link to={`/configuracoes/conexoes${location.search}`}>
          {' '}
          confira a conexão com o Telegram
        </Link>
        . Prints pelo site e importação de planilha terão suas próprias
        instruções quando estiverem disponíveis.
      </p>
    </main>
  );
}

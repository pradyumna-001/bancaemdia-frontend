import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/ProvedorAuth';
import { getApiClient } from '../../api/client';
import { ApiError } from '../../api/error';
import { ErroApi } from '../../components/ErroApi';
import { EscolhaFiltro } from '../../components/filtros/EscolhaFiltro';
import { decimal, moeda } from '../../lib/format';
import { useLeituraPainel } from '../painel/useLeituraPainel';
import { useOperacao } from './useOperacao';
import {
  address,
  validated,
  sameResource,
  sameSource,
  cell,
  FIELDS,
  SOURCES,
  SOURCE,
  UPLOAD,
  PREVIEW,
  ROWS,
  REMAP,
  CONFIRM,
  STATES,
  CONSEQUENCES,
  ERROR_CODES,
  type Source,
  type Catalog,
  type Preview,
  type Rows,
  type Result,
} from './protocol';
import type { components } from '../../api/schema';
import '../../components/filtros/filtros.css';
import './planilha.css';

type Pending =
  | { kind: 'source'; id: string; nome: string }
  | { kind: 'upload'; id: string; source: string; file: File }
  | {
      kind: 'remap';
      id: string;
      previous: string;
      body: components['schemas']['RemapInput'];
    }
  | {
      kind: 'confirm';
      id: string;
      body: components['schemas']['ConfirmInput'];
    };

function useReading<T>(
  key: readonly unknown[],
  work: (signal: AbortSignal) => Promise<T>,
  enabled = true,
) {
  const auth = useAuth();
  const reading = useLeituraPainel();
  return {
    ...useQuery({
      queryKey: ['importar', auth?.state.privateEpoch, ...key],
      queryFn: ({ signal }) => reading.read(() => work(signal)),
      enabled: enabled && auth?.state.phase === 'authenticated',
    }),
    waiting: reading.waiting,
  };
}

export function PlanilhaPage() {
  const auth = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const queries = useQueryClient();
  const write = useOperacao();
  const { cancel } = write;
  const params = new URLSearchParams(location.search);
  const route = address(params);
  const [file, setFile] = useState<File>();
  const [fileError, setFileError] = useState('');
  const [name, setName] = useState('');
  const [pending, setPending] = useState<Pending>();
  const [executing, setExecuting] = useState(false);
  const [checkedAbsent, setCheckedAbsent] = useState(false);
  const [draft, setDraft] = useState<{
    id: string;
    mapping: Record<string, number>;
    sheet: string;
  }>();
  const input = useRef<HTMLInputElement>(null);
  const active = useRef(true);
  const lock = useRef(false);
  const intendedSource = useRef<string>();
  const table = useRef<HTMLDivElement>(null);
  const catalog = useReading(
    ['fields'],
    async (signal) =>
      validated<Catalog>(
        (await getApiClient().GET(FIELDS, { signal })).data,
        `GET ${FIELDS}`,
      ),
    !route.invalid,
  );
  const sources = useReading(
    ['sources', route.sourcePage],
    async (signal) =>
      validated(
        (
          await getApiClient().GET(SOURCES, {
            params: { query: { page: route.sourcePage, page_size: 20 } },
            signal,
          })
        ).data,
        `GET ${SOURCES}`,
      ),
    !route.invalid,
  );
  const source = useReading(
    ['source', route.source],
    async (signal) =>
      sameResource(
        validated<Source>(
          (
            await getApiClient().GET(SOURCE, {
              params: { path: { source_id: route.source! } },
              signal,
            })
          ).data,
          `GET ${SOURCE}`,
        ),
        route.source!,
      ),
    !!route.source && !route.invalid,
  );
  const preview = useReading(
    ['preview', route.preview, route.source],
    async (signal) =>
      sameSource(
        sameResource(
          validated<Preview>(
            (
              await getApiClient().GET(PREVIEW, {
                params: { path: { preview_id: route.preview! } },
                signal,
              })
            ).data,
            `GET ${PREVIEW}`,
          ),
          route.preview!,
        ),
        route.source,
      ),
    !!route.preview && !route.invalid,
  );
  const rows = useReading(
    ['rows', route.preview, route.rowPage, route.source],
    async (signal) => {
      const data = validated<Rows>(
        (
          await getApiClient().GET(ROWS, {
            params: {
              path: { preview_id: route.preview! },
              query: { page: route.rowPage, page_size: 20 },
            },
            signal,
          })
        ).data,
        `GET ${ROWS}`,
      );
      if (
        data.page !== route.rowPage ||
        data.page_size !== 20 ||
        data.total < 0 ||
        data.data.length > 20 ||
        (preview.data && data.total !== preview.data.total_rows)
      )
        throw new ApiError('invalid_response');
      return data;
    },
    !!preview.data && !route.invalid,
  );
  const result = useReading(
    ['confirmation', route.confirmation, route.source, route.preview],
    async (signal) => {
      const data = sameResource(
        validated<Result>(
          (
            await getApiClient().GET(CONFIRM, {
              params: { path: { confirmation_id: route.confirmation! } },
              signal,
            })
          ).data,
          `GET ${CONFIRM}`,
        ),
        route.confirmation!,
      );
      if (
        (route.source && data.source_id !== route.source) ||
        (route.preview && data.preview_id !== route.preview)
      )
        throw new ApiError('invalid_response');
      return data;
    },
    !!route.confirmation && !route.invalid,
  );
  useEffect(() => {
    active.current = true;
    const clear = () => {
      setFile(undefined);
      setPending(undefined);
      setDraft(undefined);
      setName('');
      setFileError('');
      if (input.current) input.current.value = '';
    };
    const unregister = auth?.service.registerCleanup(clear);
    return () => {
      active.current = false;
      clear();
      unregister?.();
    };
  }, [auth?.service]);
  const identity = useRef(route.source);
  useEffect(() => {
    if (identity.current === route.source) return;
    identity.current = route.source;
    setDraft(undefined);
    if (!lock.current || intendedSource.current !== route.source) {
      cancel();
      setFile(undefined);
      setPending(undefined);
      setFileError('');
    }
  }, [route.source, cancel]);

  function change(values: Record<string, string | undefined>) {
    const copy = new URLSearchParams(location.search);
    copy.set('entrada', 'planilha');
    Object.entries(values).forEach(([key, value]) => {
      copy.delete(key);
      if (value !== undefined) copy.set(key, value);
    });
    void navigate(
      {
        pathname: location.pathname,
        search: copy.toString(),
        hash: location.hash,
      },
      { replace: true },
    );
  }
  async function perform(intent: Pending, replay = false) {
    if (
      lock.current ||
      write.busy ||
      write.waiting ||
      (write.uncertain && !replay)
    )
      return;
    lock.current = true;
    setExecuting(true);
    intendedSource.current =
      intent.kind === 'source' ? intent.id : route.source;
    setPending(intent);
    setCheckedAbsent(false);
    if (intent.kind === 'source')
      change({
        fonte: intent.id,
        previa: undefined,
        confirmacao: undefined,
        linhas_pagina: undefined,
      });
    else if (intent.kind === 'confirm') change({ confirmacao: intent.id });
    else
      change({
        previa: intent.id,
        confirmacao: undefined,
        linhas_pagina: undefined,
      });
    try {
      if (intent.kind === 'source') {
        const data = await write.run(
          `PUT ${SOURCE}`,
          async (signal) =>
            sameResource(
              validated<Source>(
                (
                  await getApiClient().PUT(SOURCE, {
                    params: { path: { source_id: intent.id } },
                    body: { nome: intent.nome },
                    signal,
                  })
                ).data,
                `PUT ${SOURCE}`,
              ),
              intent.id,
            ),
          replay,
        );
        if (data) {
          queries.setQueryData(
            ['importar', auth?.state.privateEpoch, 'source', intent.id],
            data,
          );
          await queries.invalidateQueries({
            queryKey: ['importar', auth?.state.privateEpoch, 'sources'],
          });
          setName('');
          setPending(undefined);
        }
      } else if (intent.kind === 'upload') {
        const data = await write.run(
          `POST ${UPLOAD}`,
          async (signal) => {
            const response = await getApiClient().POST(UPLOAD, {
              params: {
                path: { source_id: intent.source, preview_id: intent.id },
              },
              body: { arquivo: intent.file.name },
              bodySerializer: () => {
                const form = new FormData();
                form.append('arquivo', intent.file);
                return form;
              },
              signal,
            });
            if (response.response.status !== 201)
              throw new ApiError('invalid_response', { mutation: true });
            return sameSource(
              sameResource(
                validated<Preview>(response.data, `POST ${UPLOAD}`),
                intent.id,
              ),
              intent.source,
            );
          },
          replay,
        );
        if (data) {
          queries.setQueryData(
            [
              'importar',
              auth?.state.privateEpoch,
              'preview',
              intent.id,
              intent.source,
            ],
            data,
          );
          setFile(undefined);
          if (input.current) input.current.value = '';
          setPending(undefined);
        }
      } else if (intent.kind === 'remap') {
        const data = await write.run(
          `POST ${REMAP}`,
          async (signal) => {
            const response = await getApiClient().POST(REMAP, {
              params: {
                path: {
                  preview_id: intent.previous,
                  new_preview_id: intent.id,
                },
              },
              body: intent.body,
              signal,
            });
            if (response.response.status !== 201)
              throw new ApiError('invalid_response', { mutation: true });
            return sameSource(
              sameResource(
                validated<Preview>(response.data, `POST ${REMAP}`),
                intent.id,
              ),
              route.source,
            );
          },
          replay,
        );
        if (data) {
          queries.setQueryData(
            [
              'importar',
              auth?.state.privateEpoch,
              'preview',
              intent.id,
              route.source,
            ],
            data,
          );
          setPending(undefined);
        }
      } else {
        const data = await write.run(
          `POST ${CONFIRM}`,
          async (signal) => {
            // Explicit reading before the write; the API still decides obsolescence/permission.
            if (!replay) {
              const fresh = validated<Preview>(
                (
                  await getApiClient().GET(PREVIEW, {
                    params: { path: { preview_id: intent.body.preview_id } },
                    signal,
                  })
                ).data,
                `GET ${PREVIEW}`,
              );
              if (
                fresh.id !== intent.body.preview_id ||
                fresh.preview_hash !== intent.body.preview_hash ||
                fresh.state !== 'ready'
              )
                throw new ApiError('http', { status: 409, mutation: true });
            }
            const confirmed = sameSource(
              sameResource(
                validated<Result>(
                  (
                    await getApiClient().POST(CONFIRM, {
                      params: { path: { confirmation_id: intent.id } },
                      body: intent.body,
                      signal,
                    })
                  ).data,
                  `POST ${CONFIRM}`,
                ),
                intent.id,
              ),
              route.source,
            );
            if (confirmed.preview_id !== intent.body.preview_id)
              throw new ApiError('invalid_response', { mutation: true });
            return confirmed;
          },
          replay,
        );
        if (data) {
          queries.setQueryData(
            [
              'importar',
              auth?.state.privateEpoch,
              'confirmation',
              intent.id,
              route.source,
              intent.body.preview_id,
            ],
            data,
          );
          setPending(undefined);
          await queries.invalidateQueries({
            queryKey: ['importar', auth?.state.privateEpoch, 'source'],
          });
        }
      }
    } finally {
      lock.current = false;
      if (active.current) setExecuting(false);
    }
  }
  async function reconcile() {
    if (write.busy || write.waiting) return;
    const target =
      pending?.kind === 'source'
        ? source
        : pending?.kind === 'confirm'
          ? result
          : route.confirmation
            ? result
            : preview;
    const context = auth?.service.capture();
    if (!context?.isCurrent()) return;
    const response = await target.refetch();
    if (!active.current || !context.isCurrent()) return;
    if (response.data) {
      write.reconciled();
      setPending(undefined);
      setCheckedAbsent(false);
    } else if (
      response.error instanceof ApiError &&
      response.error.status === 404
    )
      setCheckedAbsent(true);
  }
  const info = preview.data;
  const draftMapping =
    draft && draft.id === info?.id ? draft.mapping : (info?.mapping ?? {});
  const selectedSheet =
    draft && draft.id === info?.id ? draft.sheet : info?.sheet;
  const dirty =
    !!info &&
    (selectedSheet !== info.sheet ||
      JSON.stringify(draftMapping) !== JSON.stringify(info.mapping));
  const blocked = executing || write.busy || write.waiting || write.uncertain;
  const fieldError = (error: components['schemas']['FieldError']) =>
    `${catalog.data?.fields.find((field) => field.field === error.field)?.label ?? 'Linha'}: ${Object.hasOwn(ERROR_CODES, error.code) ? ERROR_CODES[error.code] : 'Confira este campo na planilha.'}`;
  const readError = (
    query:
      | typeof catalog
      | typeof sources
      | typeof source
      | typeof preview
      | typeof rows
      | typeof result,
    label: string,
  ) =>
    query.error && !write.busy ? (
      <ErroApi
        contexto={label}
        error={query.error}
        intent="leitura"
        actions={{ tentar: () => void query.refetch() }}
      />
    ) : null;
  function restart(closeObservation = false) {
    if (write.busy || write.waiting || (blocked && !closeObservation)) return;
    if (closeObservation) cancel();
    setFile(undefined);
    setPending(undefined);
    setFileError('');
    setDraft(undefined);
    setCheckedAbsent(false);
    change({
      previa: undefined,
      confirmacao: undefined,
      linhas_pagina: undefined,
    });
    input.current?.focus();
  }
  return (
    <section className="planilha-pagina" aria-labelledby="planilha-titulo">
      <h2 id="planilha-titulo">Importar planilha</h2>
      <p>
        Escolha a fonte e o XLSX, confira as linhas e confirme quando os dados
        estiverem corretos.
      </p>
      {route.invalid ? (
        <section className="enviar-painel">
          <h3>Endereço de importação inválido</h3>
          <p>Nenhuma planilha foi enviada ou aplicada novamente.</p>
          <button
            onClick={() =>
              change({
                fonte: undefined,
                previa: undefined,
                confirmacao: undefined,
              })
            }
          >
            Escolher uma fonte
          </button>
        </section>
      ) : (
        <>
          <section className="enviar-painel" aria-label="Fonte da planilha">
            <h3>1. Fonte da planilha</h3>
            <p>
              Use a mesma fonte nas próximas importações. O nome serve para você
              reconhecê-la.
            </p>
            {sources.isFetching && <p role="status">Consultando fontes…</p>}
            {sources.data && (
              <>
                <EscolhaFiltro
                  label="Fonte cadastrada"
                  value={route.source}
                  selectedLabel={source.data?.nome ?? 'Escolher fonte'}
                  resetLabel="Nenhuma fonte selecionada"
                  disabled={blocked}
                  options={sources.data.data.map((value) => ({
                    value: value.id,
                    label: value.nome,
                  }))}
                  onChange={(value) =>
                    change({
                      fonte: value,
                      previa: undefined,
                      confirmacao: undefined,
                      linhas_pagina: undefined,
                    })
                  }
                />
                <p className="numero">
                  {decimal(sources.data.total)} fontes cadastradas · página{' '}
                  {decimal(sources.data.page)}
                </p>
                <div className="acoes">
                  <button
                    disabled={
                      blocked || sources.waiting || route.sourcePage <= 1
                    }
                    onClick={() =>
                      change({ fontes_pagina: String(route.sourcePage - 1) })
                    }
                  >
                    Fontes anteriores
                  </button>
                  <button
                    disabled={
                      blocked ||
                      sources.waiting ||
                      sources.data.page * sources.data.page_size >=
                        sources.data.total
                    }
                    onClick={() =>
                      change({ fontes_pagina: String(route.sourcePage + 1) })
                    }
                  >
                    Próximas fontes
                  </button>
                </div>
                {sources.data.total === 0 && (
                  <p>
                    Nenhuma fonte cadastrada. Registre uma fonte nova abaixo.
                  </p>
                )}
              </>
            )}
            {readError(sources, 'Fontes cadastradas')}
            {source.data ? (
              <p>
                Fonte escolhida: <strong>{source.data.nome}</strong>. Ela será
                preservada ao importar outra versão do arquivo.
              </p>
            ) : (
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  if (name.trim() && !sources.isFetching)
                    void perform({
                      kind: 'source',
                      id: route.source ?? crypto.randomUUID(),
                      nome: name.trim(),
                    });
                }}
              >
                <label htmlFor="planilha-fonte">Nome da nova fonte</label>
                <input
                  id="planilha-fonte"
                  maxLength={100}
                  value={name}
                  disabled={blocked}
                  onChange={(event) => setName(event.target.value)}
                />
                <p>
                  Registre apenas uma fonte do modelo com identificadores
                  estáveis. Uma planilha já importada pelo modelo antigo precisa
                  de reconciliação pelo administrador; cadastrar outra fonte
                  para o mesmo histórico pode duplicar apostas.
                </p>
                <button
                  disabled={
                    blocked ||
                    sources.isFetching ||
                    !name.trim() ||
                    !write.can(`PUT ${SOURCE}`)
                  }
                >
                  Registrar nova fonte
                </button>
              </form>
            )}
            {readError(source, 'Fonte escolhida')}
          </section>
          {!!source.data && (
            <section className="enviar-painel" aria-label="Arquivo da planilha">
              <h3>2. Conferir o arquivo</h3>
              <label htmlFor="planilha-arquivo">Arquivo XLSX</label>
              <p>
                Cada aposta precisa de um <strong>linha_id</strong> estável no
                arquivo. Reordenar linhas não muda esses IDs; removê-las não
                apaga apostas. Stake é em unidades, conforme o modelo.
              </p>
              <div className="enviar-seletor">
                <span aria-hidden="true">Escolher planilha</span>
                <input
                  ref={input}
                  id="planilha-arquivo"
                  type="file"
                  accept=".xlsx"
                  disabled={blocked}
                  onChange={(event) => {
                    const selected = event.target.files?.[0];
                    const error =
                      selected &&
                      (!/\.xlsx$/i.test(selected.name) ||
                        !selected.size ||
                        !catalog.data ||
                        selected.size > catalog.data.max_bytes);
                    setFile(error ? undefined : selected);
                    setFileError(
                      error
                        ? 'Escolha um XLSX não vazio dentro do limite informado.'
                        : '',
                    );
                  }}
                />
              </div>
              {catalog.data && (
                <p className="numero">
                  Até {decimal(catalog.data.max_bytes)} bytes,{' '}
                  {decimal(catalog.data.max_sheets)} abas e{' '}
                  {decimal(catalog.data.max_rows)} linhas no arquivo. Uma aba é
                  conferida por vez.
                </p>
              )}
              {file && <p>Arquivo escolhido: {file.name}</p>}
              {fileError && <p role="alert">{fileError}</p>}
              <button
                className="enviar-principal"
                disabled={
                  blocked ||
                  !file ||
                  !catalog.data ||
                  !write.can(`POST ${UPLOAD}`)
                }
                onClick={() =>
                  void perform({
                    kind: 'upload',
                    id: crypto.randomUUID(),
                    source: source.data!.id,
                    file: file!,
                  })
                }
              >
                Conferir planilha
              </button>
              <p>
                Esta etapa não grava apostas. Para corrigir células, edite o
                arquivo e envie uma nova prévia usando a mesma fonte.
              </p>
              {readError(catalog, 'Modelo da planilha')}
            </section>
          )}
          {info && (
            <section className="enviar-painel" aria-label="Prévia da planilha">
              <h3>{STATES[info.state]}</h3>
              <p>
                Somente a aba <strong>{info.sheet}</strong> está nesta prévia.
                As consequências e valores abaixo foram conferidos pelo serviço.
              </p>
              <dl className="enviar-contagens">
                {Object.entries(info.counts).map(([key, value]) => (
                  <div key={key}>
                    <dt>
                      {
                        {
                          criadas: 'Serão criadas',
                          atualizadas: 'Serão atualizadas',
                          ignoradas: 'Serão ignoradas',
                          recusadas: 'Precisam de correção',
                          revisoes: 'Irão para Revisão',
                        }[key]
                      }
                    </dt>
                    <dd className="numero">{decimal(value)}</dd>
                  </div>
                ))}
              </dl>
              {catalog.data && (
                <details className="planilha-mapeamento">
                  <summary>Conferir ou corrigir colunas</summary>
                  <EscolhaFiltro
                    label="Aba da planilha"
                    value={selectedSheet}
                    selectedLabel={selectedSheet}
                    options={info.sheets.map((value) => ({
                      value: value.name,
                      label: `${value.name} · ${decimal(value.total_rows)} linhas`,
                    }))}
                    resetLabel="Escolher aba"
                    disabled={blocked}
                    onChange={(value) => {
                      if (value) {
                        setDraft({ id: info.id, sheet: value, mapping: {} });
                      }
                    }}
                  />
                  {catalog.data.fields.map((field) => (
                    <div key={field.field}>
                      <EscolhaFiltro
                        label={field.label}
                        value={
                          draftMapping[field.field]
                            ? String(draftMapping[field.field])
                            : undefined
                        }
                        selectedLabel={
                          draftMapping[field.field]
                            ? `Coluna ${draftMapping[field.field]}`
                            : field.required
                              ? 'Escolher coluna'
                              : 'Não importar'
                        }
                        resetLabel={
                          field.required
                            ? 'Nenhuma coluna selecionada'
                            : 'Não importar'
                        }
                        options={(
                          info.sheets.find(
                            (value) => value.name === selectedSheet,
                          )?.headers ?? []
                        ).map((header, index) => ({
                          value: String(index + 1),
                          label: `Coluna ${index + 1} · ${header ?? 'Sem cabeçalho'}`,
                        }))}
                        disabled={blocked}
                        onChange={(value) => {
                          const next = { ...draftMapping };
                          if (value) next[field.field] = Number(value);
                          else delete next[field.field];
                          setDraft({
                            id: info.id,
                            sheet: selectedSheet!,
                            mapping: next,
                          });
                        }}
                      />
                      <p>
                        {field.required ? 'Obrigatório' : 'Opcional'} ·{' '}
                        {field.type === 'decimal'
                          ? 'Número'
                          : field.type === 'date-time'
                            ? 'Data e horário'
                            : field.type === 'boolean'
                              ? 'Sim/Não'
                              : field.type === 'account-id'
                                ? 'Identificador da conta'
                                : 'Texto'}
                      </p>
                    </div>
                  ))}
                  <button
                    disabled={
                      blocked || !selectedSheet || !write.can(`POST ${REMAP}`)
                    }
                    onClick={() =>
                      void perform({
                        kind: 'remap',
                        id: crypto.randomUUID(),
                        previous: info.id,
                        body: {
                          expected_revision: info.revision,
                          sheet: selectedSheet!,
                          mapping: draftMapping,
                        },
                      })
                    }
                  >
                    Gerar nova prévia
                  </button>
                </details>
              )}
              {dirty && (
                <p role="status">
                  Você alterou a aba ou as colunas. Gere uma nova prévia antes
                  de confirmar.
                </p>
              )}
              {info.mapping_errors.length > 0 && (
                <ul>
                  {info.mapping_errors.map((error, index) => (
                    <li key={index}>{fieldError(error)}</li>
                  ))}
                </ul>
              )}
              {info.state === 'obsolete' && (
                <p>
                  Os dados mudaram. Gere uma nova prévia para conferir as
                  consequências atuais; esta referência não será aplicada.
                </p>
              )}
              {rows.data && (
                <>
                  <div
                    ref={table}
                    className="planilha-tabela"
                    role="region"
                    aria-label="Linhas da aba selecionada"
                  >
                    <table>
                      <thead>
                        <tr>
                          <th>Linha</th>
                          <th>Identificador</th>
                          <th>Consequência</th>
                          <th>Valor da aposta</th>
                          <th>Stake financeira</th>
                          <th>Dados e correções</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.data.data.map((row) => (
                          <tr key={`${row.sheet}:${row.number}`}>
                            <td className="numero">{decimal(row.number)}</td>
                            <td>{row.linha_id ?? 'Não informado'}</td>
                            <td>
                              {CONSEQUENCES[row.consequence]}
                              {row.review_reason && (
                                <p>Será enviada à Revisão.</p>
                              )}
                            </td>
                            <td className="numero">
                              {moeda(row.valor_aposta_centavos)}
                            </td>
                            <td className="numero">
                              {moeda(row.stake_centavos)}
                            </td>
                            <td>
                              <details>
                                <summary>
                                  Ver dados da linha {row.number}
                                </summary>
                                <dl>
                                  {row.raw.map((value, index) => (
                                    <div key={index}>
                                      <dt>
                                        Coluna {index + 1}:{' '}
                                        {info.sheets.find(
                                          (value) => value.name === info.sheet,
                                        )?.headers[index] ?? 'Sem cabeçalho'}
                                      </dt>
                                      <dd>{cell(value)}</dd>
                                    </div>
                                  ))}
                                </dl>
                                <ul>
                                  {row.errors.map((error, index) => (
                                    <li key={index}>{fieldError(error)}</li>
                                  ))}
                                </ul>
                              </details>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p>Deslize a tabela para conferir todas as colunas.</p>
                  <div className="acoes">
                    <button
                      onClick={() =>
                        table.current?.scrollBy({
                          left: -240,
                          behavior: 'smooth',
                        })
                      }
                    >
                      Colunas anteriores
                    </button>
                    <button
                      onClick={() =>
                        table.current?.scrollBy({
                          left: 240,
                          behavior: 'smooth',
                        })
                      }
                    >
                      Próximas colunas
                    </button>
                  </div>
                  <p className="numero">
                    Página {decimal(rows.data.page)} ·{' '}
                    {decimal(rows.data.total)} linhas na aba selecionada
                  </p>
                  <div className="acoes">
                    <button
                      disabled={blocked || rows.waiting || route.rowPage <= 1}
                      onClick={() =>
                        change({ linhas_pagina: String(route.rowPage - 1) })
                      }
                    >
                      Linhas anteriores
                    </button>
                    <button
                      disabled={
                        blocked ||
                        rows.waiting ||
                        rows.data.page * rows.data.page_size >= rows.data.total
                      }
                      onClick={() =>
                        change({ linhas_pagina: String(route.rowPage + 1) })
                      }
                    >
                      Próximas linhas
                    </button>
                  </div>
                  {rows.data.total === 0 && (
                    <p>
                      A aba não tem linhas para importar. Escolha outra aba ou
                      um novo arquivo.
                    </p>
                  )}
                </>
              )}
              {readError(rows, 'Linhas da prévia')}
              <button
                className="enviar-principal"
                disabled={
                  blocked ||
                  dirty ||
                  info.state !== 'ready' ||
                  !rows.data ||
                  rows.error !== null ||
                  !!route.confirmation ||
                  !write.can(`POST ${CONFIRM}`)
                }
                onClick={() =>
                  void perform({
                    kind: 'confirm',
                    id: crypto.randomUUID(),
                    body: {
                      preview_id: info.id,
                      preview_hash: info.preview_hash,
                    },
                  })
                }
              >
                Confirmar importação
              </button>
              <p>
                Confirmar aplica os dados desta aba. Versões iguais ou antigas
                serão ignoradas conforme a fonte; dados alterados exigem nova
                conferência.
              </p>
            </section>
          )}
          {readError(preview, 'Prévia da planilha')}
          {result.data && (
            <section
              className="enviar-painel"
              aria-label="Resultado da importação"
            >
              <h3>Importação concluída</h3>
              <dl className="enviar-contagens">
                {Object.entries(result.data.counts).map(([key, value]) => (
                  <div key={key}>
                    <dt>
                      {
                        {
                          criadas: 'Criadas',
                          atualizadas: 'Atualizadas',
                          ignoradas: 'Ignoradas',
                          recusadas: 'Recusadas',
                          revisoes: 'Revisão',
                        }[key]
                      }
                    </dt>
                    <dd className="numero">{decimal(value)}</dd>
                  </div>
                ))}
              </dl>
              <p>
                Este é o resultado confirmado da aplicação. Os resumos
                consolidados podem levar um tempo para atualizar.
              </p>
              <ul>
                {result.data.rows.map((row) => (
                  <li key={row.linha_id}>
                    Linha {row.number} ·{' '}
                    {
                      {
                        created: 'Criada',
                        updated: 'Atualizada',
                        ignored: 'Ignorada',
                      }[row.outcome]
                    }{' '}
                    ·{' '}
                    <Link
                      to={`/aposta/${encodeURIComponent(row.bet_key)}${location.search}`}
                    >
                      Ver aposta
                    </Link>
                    {row.review_ids.length > 0 && (
                      <>
                        {' '}
                        ·{' '}
                        <Link to={`/revisao${location.search}`}>
                          Abrir Revisão
                        </Link>
                      </>
                    )}
                  </li>
                ))}
              </ul>
              <button disabled={blocked} onClick={() => restart()}>
                Conferir outro arquivo da mesma fonte
              </button>
            </section>
          )}
          {readError(result, 'Resultado da importação')}
          {write.busy && <p role="status">Aguarde a resposta do serviço…</p>}
          {!!write.error && (
            <ErroApi
              contexto="Pedido de importação"
              error={write.error}
              intent="gravacao"
              destination={location.pathname + location.search}
              actions={{
                conferir: () => void reconcile(),
                revisar: () => input.current?.focus(),
              }}
            />
          )}
          {(write.uncertain || (route.confirmation && !result.data)) && (
            <section className="enviar-painel">
              <h3>Confira o recebimento deste pedido</h3>
              <p>
                Consultar não repete o envio nem a aplicação. O endereço permite
                voltar a conferir; arquivo, nome e mapeamento não são guardados
                no navegador.
              </p>
              <button
                disabled={write.busy || write.waiting}
                onClick={() => void reconcile()}
              >
                Conferir recebimento
              </button>
              <p>
                Encerrar esta consulta não desfaz o pedido enviado. Ele poderá
                ter sido aplicado; mantenha a mesma fonte ao conferir outro
                arquivo.
              </p>
              <button
                disabled={write.busy || write.waiting}
                onClick={() => restart(true)}
              >
                Encerrar consulta deste pedido
              </button>
              {checkedAbsent && (
                <p>
                  O recebimento não foi encontrado. Isso não confirma que um
                  pedido em andamento será desfeito.
                </p>
              )}
              {checkedAbsent && pending && (
                <button
                  disabled={write.busy || write.waiting}
                  onClick={() => void perform(pending, true)}
                >
                  Tentar o mesmo pedido explicitamente
                </button>
              )}
            </section>
          )}
          {!write.can(`POST ${UPLOAD}`) && (
            <p>
              Sua conta permite consultar material já recebido. Confira a
              assinatura para voltar a preparar e confirmar importações.
            </p>
          )}
        </>
      )}
    </section>
  );
}

import { useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Link,
  useLocation,
  useParams,
  useSearchParams,
} from 'react-router-dom';
import { getApiClient, type createApiClient } from '../../api/client';
import { ApiError } from '../../api/error';
import { useAuth } from '../../auth/ProvedorAuth';
import { ErroApi, type ErrorField } from '../../components/ErroApi';
import { EscolhaFiltro } from '../../components/filtros/EscolhaFiltro';
import { DataFiltro } from '../../components/filtros/DataFiltro';
import { SITE_READ_CONTRACT } from '../../api/site-read.generated';
import { lerFiltros } from '../../lib/params';
import { inicioDia, deslocarDia } from '../../lib/datasFiltro';
import { useLeituraPainel as useLeitura } from '../painel/useLeituraPainel';
import { useCatalogos } from '../apostas/catalogos';
import { FinanceiroContas } from './FinanceiroContas';
import { ContaCard } from './ContaCard';
import { useEscrita } from './useEscrita';
import { useAcesso } from '../acesso/ProvedorAcesso';
import {
  identificador,
  validar,
  contaValidada,
  financeiroValidado,
  horario,
  type Titular,
} from './protocol';
import './contas.css';
import '../../components/filtros/filtros.css';

function Erro({
  error,
  retry,
  context,
  writing = false,
  fields,
}: {
  error: unknown;
  retry?: () => void;
  context: string;
  writing?: boolean;
  fields?: readonly ErrorField[];
}) {
  const location = useLocation();
  return (
    <ErroApi
      error={error}
      contexto={context}
      intent={writing ? 'gravacao' : 'leitura'}
      fields={fields}
      destination={location.pathname + location.search}
      actions={retry ? { tentar: retry } : {}}
    />
  );
}
export function ContasPage({
  client = getApiClient(),
}: {
  client?: ReturnType<typeof createApiClient>;
}) {
  const auth = useAuth();
  const { titularId } = useParams();
  return (
    <Conteudo
      key={String(auth?.state.privateEpoch) + ':' + (titularId ?? '')}
      client={client}
      rawId={titularId}
    />
  );
}
function Conteudo({
  client,
  rawId,
}: {
  client: ReturnType<typeof createApiClient>;
  rawId?: string;
}) {
  const auth = useAuth();
  const reading = useLeitura();
  const write = useEscrita();
  const access = useAcesso();
  const [params, setParams] = useSearchParams();
  const location = useLocation();
  const filters = lerFiltros(params);
  const id = identificador(rawId);
  const house = identificador(filters.valores.casa);
  const unsafeIds = ['casa', 'titular', 'conta'].some((key) => {
    const value = filters.valores[key as 'casa' | 'titular' | 'conta'];
    return !!value && !identificador(value);
  });
  const pageValues = params.getAll('titulares_pagina');
  const page =
    pageValues.length === 1 ? (identificador(pageValues[0]) ?? 1) : 1;
  const searchValues = params.getAll('buscar_titular');
  const search =
    searchValues.length === 1 && searchValues[0]!.length <= 160
      ? searchValues[0]!
      : '';
  const archived =
    params.getAll('arquivados').length === 1 &&
    params.get('arquivados') === '1';
  const [searchText, setSearchText] = useState(search);
  const [name, setName] = useState('');
  const [nickname, setNickname] = useState('');
  const [newHouse, setNewHouse] = useState<string>();
  const [rename, setRename] = useState<string>();
  const confirm = useRef<HTMLDialogElement>(null);
  const archiveTrigger = useRef<HTMLButtonElement>(null);
  const eligible = auth?.state.phase === 'authenticated' && (!rawId || !!id);
  const key = ['contas', auth?.state.privateEpoch];
  function change(values: Record<string, string | undefined>) {
    if (reading.waiting || write.busy) return;
    const copy = new URLSearchParams(location.search);
    for (const [k, v] of Object.entries(values)) {
      if (v === undefined) copy.delete(k);
      else copy.set(k, v);
    }
    setParams(copy);
  }
  const list = useQuery({
    queryKey: [...key, 'titulares', page, search, archived],
    enabled: eligible && !id,
    retryOnMount: false,
    queryFn: ({ signal }) =>
      reading.read(async () => {
        const { data } = await client.GET('/api/v1/titulares', {
          params: {
            query: { search, include_archived: archived, page, page_size: 50 },
          },
          signal,
        });
        const value = validar(data, '/api/v1/titulares');
        if (value.page !== page || value.page_size !== 50 || value.total < 0)
          throw new ApiError('invalid_response');
        value.data.forEach((holder) => {
          if (!identificador(String(holder.id)))
            throw new ApiError('invalid_response');
          horario(holder.criado_em);
        });
        return value;
      }),
  });
  const matrix = useQuery({
    queryKey: [...key, 'matriz', id, house],
    enabled: eligible && (!!id || !!house),
    retryOnMount: false,
    queryFn: ({ signal }) =>
      reading.read(async () => {
        if (id) {
          const { data } = await client.GET(
            '/api/v1/titulares/{titular_id}/matriz',
            { params: { path: { titular_id: id } }, signal },
          );
          const value = validar(data, '/api/v1/titulares/{titular_id}/matriz');
          if (
            value.titular.id !== id ||
            value.contas.some((a) => a.titular_id !== id)
          )
            throw new ApiError('invalid_response');
          horario(value.titular.criado_em);
          value.contas.forEach(contaValidada);
          return value;
        }
        const { data } = await client.GET(
          '/api/v1/titulares/casas/{casa_id}/matriz',
          { params: { path: { casa_id: house! } }, signal },
        );
        const value = validar(data, '/api/v1/titulares/casas/{casa_id}/matriz');
        if (
          value.casa_id !== house ||
          value.contas.some((a) => a.casa_id !== house)
        )
          throw new ApiError('invalid_response');
        value.contas.forEach(contaValidada);
        return value;
      }),
  });
  const financialQuery: {
    casa_id?: number;
    titular_id?: number;
    conta_casa_id?: number;
    desde?: string;
    ate?: string;
  } = {
    casa_id: house,
    titular_id: identificador(filters.valores.titular) ?? id,
    conta_casa_id: identificador(filters.valores.conta),
  };
  const dateConflict =
    !!(
      filters.valores.desde &&
      filters.valores.ate &&
      filters.valores.desde > filters.valores.ate
    ) || filters.valores.ate === '9999-12-31';
  if (!dateConflict) {
    if (filters.valores.desde)
      financialQuery.desde = inicioDia(filters.valores.desde);
    if (filters.valores.ate)
      financialQuery.ate = inicioDia(deslocarDia(filters.valores.ate, 1));
  }
  const financial = useQuery({
    queryKey: [...key, 'financeiro', financialQuery],
    enabled: eligible && !dateConflict && !unsafeIds,
    retryOnMount: false,
    queryFn: ({ signal }) =>
      reading.read(async () => {
        const { data } = await client.GET('/api/v1/titulares/financeiro', {
          params: { query: financialQuery },
          signal,
        });
        return financeiroValidado(
          validar(data, '/api/v1/titulares/financeiro'),
        );
      }),
  });
  const catalogs = useCatalogos(
    SITE_READ_CONTRACT,
    client,
    filters,
    ['casa'],
    eligible,
  );
  const houses = catalogs.casa;
  const holder: Titular | undefined =
    matrix.data && 'titular' in matrix.data ? matrix.data.titular : undefined;
  const destination = (path: string) => path + location.search;
  if (rawId && !id)
    return (
      <main className="pagina contas-pagina">
        <h1>Titular não encontrado</h1>
        <p>Confira o endereço ou escolha um titular cadastrado.</p>
        <Link to={destination('/contas')}>Voltar a Contas e titulares</Link>
      </main>
    );
  return (
    <main className="pagina contas-pagina">
      <h1>
        {holder ? holder.nome : id ? 'Contas do titular' : 'Contas e titulares'}
      </h1>
      <p>
        Organize quem é o titular e quais contas ele usa em cada casa. A banca e
        o dinheiro de cada conta são informações separadas.
      </p>
      <nav className="contas-atalhos" aria-label="Navegação de contas">
        <Link to={destination('/contas/trocar')}>Trocar conta em uso</Link>
        {id && <Link to={destination('/contas')}>Todos os titulares</Link>}
      </nav>
      {!write.can('POST /api/v1/titulares') && access?.phase !== 'checking' && (
        <p>
          Os dados continuam disponíveis para consulta. Alterações exigem acesso
          de escrita.
        </p>
      )}
      {filters.invalidos.length > 0 && (
        <p role="status">
          Parâmetros inválidos foram ignorados nesta consulta.
        </p>
      )}
      {write.message && <p role="status">{write.message}</p>}
      {write.error !== undefined && (
        <>
          <Erro
            error={write.error}
            context="Alteração de titular ou conta"
            writing
            fields={write.fields}
          />
          <button
            type="button"
            disabled={write.busy || write.waiting || reading.waiting}
            onClick={() => void write.reconcile()}
          >
            Consultar estado atual
          </button>
        </>
      )}
      {id && matrix.isPending ? (
        <p role="status" className="consulta-carregando">
          Consultando contas e histórico…
        </p>
      ) : (
        <>
          {!id && (
            <section aria-labelledby="contas-titulares">
              <h2 id="contas-titulares">Titulares</h2>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  change({
                    buscar_titular: searchText.trim() || undefined,
                    titulares_pagina: undefined,
                  });
                }}
              >
                <label>
                  Buscar titular
                  <input
                    maxLength={160}
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                  />
                </label>
                <button disabled={reading.waiting}>Buscar</button>
              </form>
              <button
                type="button"
                aria-pressed={archived}
                disabled={reading.waiting}
                onClick={() =>
                  change({
                    arquivados: archived ? undefined : '1',
                    titulares_pagina: undefined,
                  })
                }
              >
                {archived
                  ? 'Ocultar titulares arquivados'
                  : 'Incluir titulares arquivados'}
              </button>
              {search && (
                <button
                  type="button"
                  disabled={reading.waiting}
                  onClick={() => {
                    setSearchText('');
                    change({
                      buscar_titular: undefined,
                      titulares_pagina: undefined,
                    });
                  }}
                >
                  Remover busca: {search}
                </button>
              )}
              {list.isPending && (
                <p role="status" className="consulta-carregando">
                  Consultando titulares…
                </p>
              )}
              {list.isError && (
                <Erro
                  context="Lista de titulares"
                  error={list.error}
                  retry={() => void list.refetch()}
                />
              )}
              {list.data && (
                <>
                  {list.data.data.length ? (
                    <ul className="contas-grid">
                      {list.data.data.map((h) => (
                        <li className="contas-caixa" key={h.id}>
                          <Link to={destination('/contas/' + h.id)}>
                            {h.nome}
                          </Link>
                          {h.arquivado && (
                            <p>Arquivado · histórico preservado</p>
                          )}
                          <p>Cadastrado em {horario(h.criado_em)}</p>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p>
                      Nenhum titular nesta consulta. Remova a busca, inclua
                      arquivados ou cadastre um titular abaixo.
                    </p>
                  )}
                  <nav aria-label="Páginas de titulares" className="acoes">
                    <button
                      disabled={
                        page === 1 || reading.waiting || list.isFetching
                      }
                      onClick={() =>
                        change({ titulares_pagina: String(page - 1) })
                      }
                    >
                      Página anterior
                    </button>
                    <span className="numero">
                      Página {page} · {list.data.total} titulares
                    </span>
                    <button
                      disabled={
                        page * 50 >= list.data.total ||
                        reading.waiting ||
                        list.isFetching
                      }
                      onClick={() =>
                        change({ titulares_pagina: String(page + 1) })
                      }
                    >
                      Próxima página
                    </button>
                  </nav>
                </>
              )}
              <details className="contas-caixa">
                <summary>Cadastrar titular</summary>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!name.trim()) return;
                    void write
                      .run(
                        'POST /api/v1/titulares',
                        async (signal) => {
                          const { data } = await client.POST(
                            '/api/v1/titulares',
                            {
                              body: { nome: name.trim() },
                              signal,
                            },
                          );
                          const created = validar(
                            data,
                            'POST /api/v1/titulares',
                          );
                          if (!identificador(String(created.id)))
                            throw new ApiError('invalid_response', {
                              mutation: true,
                            });
                        },
                        'Titular cadastrado. Abra suas contas na lista.',
                        [
                          {
                            scope: 'body',
                            field: 'nome',
                            id: 'contas-nome',
                            label: 'Nome do titular',
                          },
                        ],
                      )
                      .then((ok) => {
                        if (ok) setName('');
                      });
                  }}
                >
                  <label>
                    Nome do titular
                    <input
                      id="contas-nome"
                      required
                      maxLength={160}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      disabled={
                        write.blocked || !write.can('POST /api/v1/titulares')
                      }
                    />
                  </label>
                  <button
                    disabled={
                      write.blocked ||
                      !write.can('POST /api/v1/titulares') ||
                      !name.trim()
                    }
                  >
                    Cadastrar titular
                  </button>
                </form>
              </details>
            </section>
          )}
          {holder && (
            <section aria-labelledby="contas-cadastro">
              <h2 id="contas-cadastro">Cadastro do titular</h2>
              {holder.arquivado ? (
                <p>
                  Este titular está arquivado. Suas contas e vigências
                  permanecem no histórico.
                </p>
              ) : (
                <>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const value = (rename ?? holder.nome).trim();
                      if (!value) return;
                      void write.run(
                        'PATCH /api/v1/titulares/{titular_id}',
                        async (signal) => {
                          const { data } = await client.PATCH(
                            '/api/v1/titulares/{titular_id}',
                            {
                              params: { path: { titular_id: id! } },
                              body: { nome: value },
                              signal,
                            },
                          );
                          validar(data, 'PATCH /api/v1/titulares/{titular_id}');
                        },
                        'Nome do titular atualizado.',
                        [
                          {
                            scope: 'body',
                            field: 'nome',
                            id: 'contas-nome',
                            label: 'Nome do titular',
                          },
                        ],
                      );
                    }}
                  >
                    <label>
                      Nome do titular
                      <input
                        id="contas-nome"
                        maxLength={160}
                        required
                        value={rename ?? holder.nome}
                        onChange={(e) => setRename(e.target.value)}
                        disabled={
                          write.blocked ||
                          !write.can('PATCH /api/v1/titulares/{titular_id}')
                        }
                      />
                    </label>
                    <button
                      disabled={
                        write.blocked ||
                        !write.can('PATCH /api/v1/titulares/{titular_id}') ||
                        !(rename ?? holder.nome).trim()
                      }
                    >
                      Salvar titular
                    </button>
                  </form>
                  <button
                    ref={archiveTrigger}
                    type="button"
                    disabled={
                      write.blocked ||
                      !write.can('DELETE /api/v1/titulares/{titular_id}')
                    }
                    onClick={() => confirm.current!.showModal()}
                  >
                    Arquivar titular
                  </button>
                  <dialog
                    ref={confirm}
                    aria-labelledby="contas-arquivar"
                    onClose={() => archiveTrigger.current?.focus()}
                  >
                    <h2 id="contas-arquivar">Arquivar {holder.nome}?</h2>
                    <p>
                      Contas e histórico serão preservados. Se houver conta em
                      uso, troque-a antes de arquivar.
                    </p>
                    <div className="acoes">
                      <button
                        type="button"
                        onClick={() => confirm.current!.close()}
                      >
                        Agora não
                      </button>
                      <button
                        type="button"
                        disabled={write.blocked}
                        onClick={() => {
                          confirm.current!.close();
                          void write.run(
                            'DELETE /api/v1/titulares/{titular_id}',
                            async (signal) => {
                              const { data } = await client.DELETE(
                                '/api/v1/titulares/{titular_id}',
                                {
                                  params: { path: { titular_id: id! } },
                                  signal,
                                },
                              );
                              validar(
                                data,
                                'DELETE /api/v1/titulares/{titular_id}',
                              );
                            },
                            'Titular arquivado. O histórico foi preservado.',
                          );
                        }}
                      >
                        Confirmar arquivo
                      </button>
                    </div>
                  </dialog>
                </>
              )}
            </section>
          )}
          <section aria-labelledby="contas-matriz">
            <h2 id="contas-matriz">
              {id ? 'Contas deste titular' : 'Contas por casa'}
            </h2>
            {!id && (
              <EscolhaFiltro
                label="Casa"
                onOpen={houses?.abrir}
                value={filters.valores.casa}
                options={houses?.options ?? []}
                selectedLabel={houses?.selecionada?.label}
                onChange={(value) => change({ casa: value })}
                disabled={reading.waiting}
                busca={
                  houses?.buscar
                    ? {
                        consulta: houses.consulta ?? '',
                        buscar: houses.buscar,
                        atualizando: houses.atualizando,
                      }
                    : undefined
                }
              >
                <p>Escolha uma casa para consultar todas as contas nela.</p>
                {houses?.fase === 'carregando' && (
                  <p role="status">Consultando casas…</p>
                )}
                {houses?.fase === 'pronto' && !houses.options.length && (
                  <p>
                    Nenhuma casa nesta busca. Tente outro nome ou busque sem
                    texto.
                  </p>
                )}
                {houses?.erro && <p role="alert">{houses.erro}</p>}
                <div className="acoes">
                  {houses?.anterior && (
                    <button onClick={houses.anterior}>Opções anteriores</button>
                  )}
                  {houses?.proxima && (
                    <button onClick={houses.proxima}>Mais casas</button>
                  )}
                  {houses?.tentar && houses.fase === 'erro' && (
                    <button onClick={houses.tentar}>
                      Tentar consultar casas
                    </button>
                  )}
                </div>
              </EscolhaFiltro>
            )}
            {id && house && (
              <p>
                Esta matriz mostra todas as casas do titular. O filtro de casa é
                aplicado apenas ao financeiro abaixo.
              </p>
            )}
            {!id && !house && (
              <p>
                Escolha uma casa ou abra um titular para consultar contas e
                vigências.
              </p>
            )}
            {!id && house && matrix.isPending && (
              <p role="status" className="consulta-carregando">
                Consultando contas e histórico…
              </p>
            )}
            {matrix.isError && (
              <Erro
                context="Contas e vigências"
                error={matrix.error}
                retry={() => void matrix.refetch()}
              />
            )}
            {matrix.data && (
              <>
                {'casa_nome' in matrix.data && <h3>{matrix.data.casa_nome}</h3>}
                <div className="contas-grid">
                  {matrix.data.contas.map((account) => (
                    <ContaCard
                      key={
                        account.conta_casa_id +
                        ':' +
                        account.apelido +
                        ':' +
                        account.estado
                      }
                      account={account}
                      client={client}
                      write={write}
                    />
                  ))}
                </div>
                {!matrix.data.contas.length && (
                  <p>
                    Nenhuma conta cadastrada. Abra ou cadastre um titular para
                    criar a primeira conta.
                  </p>
                )}
                {'titulares_sem_conta' in matrix.data &&
                  matrix.data.titulares_sem_conta.length > 0 && (
                    <>
                      <h3>Titulares sem conta nesta casa</h3>
                      <ul>
                        {matrix.data.titulares_sem_conta.map((h) => (
                          <li key={h.id}>
                            <Link to={destination('/contas/' + h.id)}>
                              {h.nome} · cadastrar conta
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
              </>
            )}
            {holder && !holder.arquivado && (
              <details className="contas-caixa">
                <summary>Cadastrar conta</summary>
                <p>
                  Use apenas um apelido. Não informe senha, cookie ou documento
                  da casa.
                </p>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const houseId = identificador(newHouse);
                    if (!houseId || !nickname.trim()) return;
                    void write
                      .run(
                        'POST /api/v1/titulares/{titular_id}/contas',
                        async (signal) => {
                          const { data } = await client.POST(
                            '/api/v1/titulares/{titular_id}/contas',
                            {
                              params: { path: { titular_id: id! } },
                              body: {
                                casa_id: houseId,
                                apelido: nickname.trim(),
                              },
                              signal,
                            },
                          );
                          contaValidada(
                            validar(
                              data,
                              'POST /api/v1/titulares/{titular_id}/contas',
                            ),
                          );
                        },
                        'Conta cadastrada. A ativação é uma ação separada.',
                        [
                          {
                            scope: 'body',
                            field: 'apelido',
                            id: 'contas-nova-apelido',
                            label: 'Apelido da conta',
                          },
                        ],
                      )
                      .then((ok) => {
                        if (ok) {
                          setNickname('');
                          setNewHouse(undefined);
                        }
                      });
                  }}
                >
                  <label>
                    Apelido da conta
                    <input
                      id="contas-nova-apelido"
                      required
                      maxLength={160}
                      value={nickname}
                      onChange={(e) => setNickname(e.target.value)}
                      disabled={write.blocked}
                    />
                  </label>
                  <EscolhaFiltro
                    label="Casa da nova conta"
                    onOpen={houses?.abrir}
                    value={newHouse}
                    resetLabel="Escolher casa"
                    options={houses?.options ?? []}
                    disabled={write.blocked}
                    onChange={setNewHouse}
                    busca={
                      houses?.buscar
                        ? {
                            consulta: houses.consulta ?? '',
                            buscar: houses.buscar,
                            atualizando: houses.atualizando,
                          }
                        : undefined
                    }
                  >
                    {houses?.erro && <p role="alert">{houses.erro}</p>}
                    {houses?.fase === 'carregando' && (
                      <p role="status">Consultando casas…</p>
                    )}
                    {houses?.fase === 'pronto' && !houses.options.length && (
                      <p>
                        Nenhuma casa nesta busca. Tente outro nome ou busque sem
                        texto.
                      </p>
                    )}
                    {houses?.anterior && (
                      <button type="button" onClick={houses.anterior}>
                        Opções anteriores
                      </button>
                    )}
                    {houses?.proxima && (
                      <button type="button" onClick={houses.proxima}>
                        Mais casas
                      </button>
                    )}
                    {houses?.tentar && houses.fase === 'erro' && (
                      <button type="button" onClick={houses.tentar}>
                        Tentar consultar casas
                      </button>
                    )}
                  </EscolhaFiltro>
                  {newHouse && !identificador(newHouse) && (
                    <p role="alert">
                      O cadastro de conta ainda não está disponível para esta
                      casa. Escolha outra casa ou tente mais tarde.
                    </p>
                  )}
                  <button
                    disabled={
                      write.blocked ||
                      !write.can(
                        'POST /api/v1/titulares/{titular_id}/contas',
                      ) ||
                      !identificador(newHouse) ||
                      !nickname.trim()
                    }
                  >
                    Cadastrar conta
                  </button>
                </form>
              </details>
            )}
          </section>
          <section aria-label="Recorte financeiro">
            <h2>Recorte financeiro</h2>
            <nav aria-label="Filtros do financeiro" className="acoes">
              {(['casa', 'titular', 'conta', 'desde', 'ate'] as const)
                .filter((key) => filters.valores[key])
                .map((key) => (
                  <button
                    type="button"
                    key={key}
                    disabled={reading.waiting}
                    onClick={() => change({ [key]: undefined })}
                  >
                    Remover{' '}
                    {
                      (
                        {
                          casa: 'Casa',
                          titular: 'Titular',
                          conta: 'Conta',
                          desde: 'Data inicial',
                          ate: 'Data final',
                        } as const
                      )[key]
                    }
                    :{' '}
                    {key === 'casa'
                      ? (houses?.selecionada?.label ?? filters.valores[key])
                      : filters.valores[key]}
                  </button>
                ))}
            </nav>
            {unsafeIds && (
              <p role="alert">
                A consulta não está disponível para esta casa, titular ou conta.
                Seus filtros foram preservados; remova o filtro para consultar
                outro recorte.
              </p>
            )}
            <p>
              Aplicados: casa, titular, conta e datas presentes no endereço.
              Outros filtros do site permanecem no endereço, sem efeito nesta
              consulta. Saldos são atuais, independentemente das datas.
            </p>
            <fieldset
              className="acoes contas-datas"
              disabled={reading.waiting || write.busy}
            >
              <legend>Datas do recorte</legend>
              <DataFiltro
                label="Data inicial do financeiro"
                value={filters.valores.desde}
                onChange={(v) => change({ desde: v })}
              />
              <DataFiltro
                label="Data final do financeiro"
                value={filters.valores.ate}
                onChange={(v) => change({ ate: v })}
              />
            </fieldset>
            {dateConflict && (
              <p role="alert">
                Corrija as datas: o início deve ser anterior ou igual ao fim, e
                a data final precisa ser anterior a 31/12/9999.
              </p>
            )}
            {!dateConflict && !unsafeIds && financial.isPending && (
              <p role="status">Consultando financeiro…</p>
            )}
            {financial.isError && (
              <Erro
                error={financial.error}
                context="Financeiro por titular e conta"
                retry={() => void financial.refetch()}
              />
            )}
          </section>
          {financial.data && !dateConflict && !unsafeIds && (
            <FinanceiroContas data={financial.data} />
          )}
        </>
      )}
    </main>
  );
}

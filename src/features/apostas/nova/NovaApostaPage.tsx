import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type FormEvent,
} from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { getApiClient } from '../../../api/client';
import { ApiError } from '../../../api/error';
import { SITE_READ_CONTRACT } from '../../../api/site-read.generated';
import { useAuth } from '../../../auth/ProvedorAuth';
import { ErroApi, type ErrorField } from '../../../components/ErroApi';
import { EscolhaFiltro } from '../../../components/filtros/EscolhaFiltro';
import { lerFiltros } from '../../../lib/params';
import { useRetryAfter } from '../../../lib/useRetryAfter';
import { useCatalogos } from '../catalogos';
import { validar as validarConta } from '../../contas/protocol';
import type { components } from '../../../api/schema';
import { useOperacao } from '../../importar/useOperacao';
import {
  PATH,
  POST,
  destinoRecibo,
  inicial,
  pedido,
  uuidValido,
  validarRecibo,
  type Pedido,
  type Rascunho,
  type Recibo,
} from './protocol';
import './nova.css';

const CAMPOS = [
  ['odd', 'Odd', 'odd'],
  ['unidades', 'Valor em unidades', 'stake_unidades'],
  ['evento', 'Evento', 'evento'],
  ['descricao', 'Descrição', 'descricao'],
  ['mercado', 'Mercado', 'mercado_bruto'],
  ['aposta', 'Data/hora da aposta', 'data_aposta'],
  ['jogo', 'Data/hora do jogo', 'data_jogo'],
  ['comissao', 'Comissão (R$)', 'comissao_centavos'],
] as const;
const fields: ErrorField[] = CAMPOS.map(([key, label, field]) => ({
  scope: 'body',
  field,
  label,
  id: 'nova-' + key,
}));
fields.push(
  { scope: 'body', field: 'casa', label: 'Casa', id: 'nova-casa' },
  { scope: 'body', field: 'conta_casa_id', label: 'Conta', id: 'nova-conta' },
);
type Intento = { id: string; body: Pedido };
export function NovaApostaPage({
  client,
}: {
  client?: ReturnType<typeof getApiClient>;
}) {
  const auth = useAuth();
  return auth &&
    (auth.state.phase === 'authenticated' ||
      (auth.state.phase === 'checking' && auth.state.person)) ? (
    <Formulario key={auth.state.privateEpoch} api={client ?? getApiClient()} />
  ) : (
    <main className="pagina">
      <h1>Nova aposta</h1>
      <p role="status">Consultando sessão…</p>
    </main>
  );
}
function Formulario({ api }: { api: ReturnType<typeof getApiClient> }) {
  const auth = useAuth()!;
  const navigate = useNavigate();
  const [search, setSearch] = useSearchParams();
  const latest = useRef(search);
  useLayoutEffect(() => {
    latest.current = search;
  }, [search]);
  const id = search.get('manual_intencao');
  const valid = uuidValido(id) && search.getAll('manual_intencao').length === 1;
  const [form, setForm] = useState<Rascunho>({ ...inicial });
  const [editable, setEditable] = useState(!search.has('manual_intencao'));
  const [localError, setLocalError] = useState('');
  const [lookupError, setLookupError] = useState<unknown>();
  const [reading, setReading] = useState(false);
  const [consulted, setConsulted] = useState(false);
  const [sending, setSending] = useState(false);
  const alive = useRef(false);
  const active = useRef<AbortController>();
  const attempt = useRef<Intento>();
  const queued = useRef<Intento>();
  const acting = useRef(false);
  const dispatch =
    useRef<(value: Intento, replay?: boolean) => Promise<void>>();
  const op = useOperacao();
  const { cancel } = op;
  const wait = useRetryAfter(lookupError);
  const epoch = auth.state.privateEpoch;
  const catalogSearch = new URLSearchParams();
  if (form.casa) catalogSearch.set('casa', form.casa);
  const catalog = useCatalogos(
    SITE_READ_CONTRACT,
    api,
    lerFiltros(catalogSearch),
    ['casa'],
    editable,
  ).casa;
  const casa =
    catalog?.options.find((o) => o.value === form.casa) ?? catalog?.selecionada;
  const houseId = Number(form.casa);
  const consultableHouse = Number.isSafeInteger(houseId) && houseId > 0;
  const matrix = useQuery({
    queryKey: ['nova-aposta-contas', epoch, auth.state.person?.id, form.casa],
    enabled: editable && !!form.casa && consultableHouse,
    retryOnMount: false,
    refetchOnWindowFocus: false,
    queryFn: ({ signal }) =>
      auth.service.read(async () => {
        const data = validarConta<components['schemas']['MatrizCasaSaida']>(
          (
            await api.GET('/api/v1/titulares/casas/{casa_id}/matriz', {
              signal,
              params: { path: { casa_id: houseId } },
            })
          ).data,
          '/api/v1/titulares/casas/{casa_id}/matriz',
        );
        if (data.casa_id !== houseId) throw new ApiError('invalid_response');
        return data;
      }),
  });
  const matrixWait = useRetryAfter(matrix.error);
  const blocked =
    sending ||
    op.busy ||
    reading ||
    op.waiting ||
    wait ||
    auth.state.phase !== 'authenticated';
  useEffect(() => {
    alive.current = true;
    const clean = () => {
      active.current?.abort();
      attempt.current = undefined;
      queued.current = undefined;
      setForm({ ...inicial });
      setEditable(false);
      setLocalError('');
      setLookupError(undefined);
    };
    const unregister = auth.service.registerCleanup(clean);
    return () => {
      alive.current = false;
      clean();
      unregister();
      cancel();
    };
  }, [auth.service, cancel]);
  useEffect(() => {
    if (
      op.error instanceof ApiError &&
      !op.error.outcomeUnknown &&
      [400, 402, 403, 413, 422, 429].includes(op.error.status)
    )
      setEditable(true);
  }, [op.error]);
  useEffect(() => {
    if (attempt.current && attempt.current.id !== id) {
      active.current?.abort();
      cancel();
      attempt.current = undefined;
      queued.current = undefined;
      setForm({ ...inicial });
      setEditable(false);
      setConsulted(false);
    }
  }, [id, cancel]);
  function install(value: Recibo) {
    attempt.current = undefined;
    navigate(destinoRecibo(value, latest.current));
  }
  async function send(value: Intento, replay = false) {
    const result = await op.run(
      POST,
      async (signal) =>
        validarRecibo(
          (
            await api.POST(PATH, {
              signal,
              params: { path: { intencao_id: value.id } },
              body: value.body,
            })
          ).data,
          value.id,
        ),
      replay,
    );
    if (
      result &&
      alive.current &&
      latest.current.get('manual_intencao') === value.id
    )
      install(result);
  }
  useLayoutEffect(() => {
    dispatch.current = send;
  });
  useEffect(() => {
    const value = queued.current;
    if (value && id === value.id) {
      queued.current = undefined;
      void dispatch.current?.(value).finally(() => {
        acting.current = false;
        if (alive.current && auth.service.getSnapshot().privateEpoch === epoch)
          setSending(false);
      });
    }
  }, [id, sending, auth.service, epoch]);
  function submit(event: FormEvent) {
    event.preventDefault();
    if (acting.current || blocked || !editable || !op.can(POST)) return;
    try {
      const body = pedido(form, casa?.nome ?? '');
      const value = { id: valid ? id : crypto.randomUUID(), body };
      acting.current = true;
      setSending(true);
      setEditable(false);
      setConsulted(false);
      setLocalError('');
      setLookupError(undefined);
      attempt.current = value;
      queued.current = value;
      const next = new URLSearchParams(latest.current);
      next.set('manual_intencao', value.id);
      if (next.toString() !== latest.current.toString())
        setSearch(next, { replace: true });
    } catch (error) {
      setLocalError(
        error instanceof Error ? error.message : 'Confira os campos.',
      );
    }
  }
  async function lookup() {
    if (blocked || !valid || active.current) return;
    const request = new AbortController();
    active.current = request;
    const scope = auth.service.capture();
    const current = () =>
      alive.current &&
      !request.signal.aborted &&
      scope.isCurrent() &&
      latest.current.get('manual_intencao') === id;
    setReading(true);
    setConsulted(false);
    setLookupError(undefined);
    try {
      const result = await auth.service.read(async () =>
        validarRecibo(
          (
            await api.GET(PATH, {
              signal: request.signal,
              params: { path: { intencao_id: id } },
            })
          ).data,
          id,
        ),
      );
      if (current()) install(result);
    } catch (error) {
      if (current()) {
        setLookupError(error);
        setConsulted(error instanceof ApiError && error.status === 404);
      }
    } finally {
      if (active.current === request) active.current = undefined;
      if (alive.current) setReading(false);
    }
  }
  function update<K extends keyof Rascunho>(key: K, value: Rascunho[K]) {
    setForm((old) => ({
      ...old,
      [key]: value,
      ...(key === 'casa' ? { conta: undefined } : {}),
    }));
  }
  function input(key: (typeof CAMPOS)[number][0], label: string) {
    const decimal = ['odd', 'unidades', 'comissao'].includes(key);
    const date = key === 'aposta' || key === 'jogo';
    return (
      <div
        className={'nova-campo ' + (key === 'descricao' ? 'nova-largo' : '')}
        key={key}
      >
        <label htmlFor={'nova-' + key}>{label}</label>
        {key === 'descricao' ? (
          <textarea
            id={'nova-' + key}
            maxLength={10000}
            value={form[key]}
            onChange={(e) => update(key, e.target.value)}
          />
        ) : (
          <input
            id={'nova-' + key}
            type="text"
            aria-describedby={date ? 'nova-' + key + '-ajuda' : undefined}
            inputMode={decimal ? 'decimal' : 'text'}
            maxLength={date ? 32 : decimal ? 60 : 10000}
            value={form[key]}
            onChange={(e) => update(key, e.target.value)}
            placeholder={date ? '16/10/2026 19:00-03:00' : undefined}
            required={key === 'odd' || key === 'unidades'}
          />
        )}
        {date && (
          <small id={'nova-' + key + '-ajuda'}>
            Dia/mês/ano, hora e fuso. Exemplo: 16/10/2026 19:00-03:00.
          </small>
        )}
      </div>
    );
  }
  return (
    <main className="pagina pagina-interna nova-pagina">
      <header className="nova-cabecalho">
        <div>
          <h1>Nova aposta</h1>
          <p>Registre uma aposta que você fez.</p>
        </div>
        <Link to={'/' + (search.size ? '?' + search.toString() : '')}>
          Voltar às apostas
        </Link>
      </header>
      {search.has('manual_intencao') && !valid && (
        <section className="nova-recuperacao">
          <h2>Referência de registro inválida</h2>
          <p>
            Confira o endereço original. Nenhum pedido será enviado por esta
            referência.
          </p>
          <button
            type="button"
            onClick={() => {
              const next = new URLSearchParams(search);
              next.delete('manual_intencao');
              setSearch(next, { replace: true });
              setEditable(true);
            }}
          >
            Abrir formulário novo
          </button>
        </section>
      )}
      {valid && !editable && (
        <section className="nova-recuperacao" aria-label="Conferir registro">
          <h2>Confira o registro antes de continuar</h2>
          <p>
            Esta referência pode corresponder a uma aposta já salva. Consultar
            não envia outra aposta.
          </p>
          {!attempt.current && (
            <p>
              Os campos anteriores não são guardados após sair. Use a consulta
              para recuperar a confirmação.
            </p>
          )}
          <button
            type="button"
            disabled={blocked}
            onClick={() => void lookup()}
          >
            {reading ? 'Consultando registro…' : 'Consultar registro'}
          </button>
          {consulted && (
            <p>
              Não há confirmação visível nesta consulta. Isso não garante que o
              pedido foi desfeito.
            </p>
          )}
          {consulted && attempt.current && (
            <button
              type="button"
              disabled={blocked || !op.can(POST)}
              onClick={() => {
                if (acting.current || !attempt.current) return;
                acting.current = true;
                setSending(true);
                setConsulted(false);
                void send(attempt.current, true).finally(() => {
                  acting.current = false;
                  if (alive.current) setSending(false);
                });
              }}
            >
              Reenviar este mesmo pedido
            </button>
          )}
          {lookupError instanceof ApiError && lookupError.status === 410 && (
            <p>
              O prazo de recuperação terminou. Confira o registro com o suporte;
              não tente recriá-lo com outra referência.
            </p>
          )}
        </section>
      )}
      {!!op.error && (
        <ErroApi
          error={op.error}
          intent="gravacao"
          fields={fields}
          destination={'/aposta/nova?' + search.toString()}
        />
      )}
      {!!lookupError && (
        <ErroApi
          error={lookupError}
          intent="leitura"
          destination={'/aposta/nova?' + search.toString()}
        />
      )}
      <div className="nova-layout">
        <form className="nova-form" onSubmit={submit}>
          <fieldset
            disabled={
              blocked || !editable || (search.has('manual_intencao') && !valid)
            }
          >
            <legend>Dados da aposta</legend>
            <div className="nova-campos">
              <div className="nova-largo">
                <EscolhaFiltro
                  id="nova-casa"
                  dentroDeFormulario
                  label="Casa"
                  value={form.casa}
                  options={catalog?.options ?? []}
                  selectedLabel={
                    casa?.label ??
                    (form.casa ? 'Casa selecionada' : 'Escolha a casa')
                  }
                  resetLabel="Escolher depois"
                  disabled={blocked || !editable}
                  onChange={(v) => update('casa', v ?? '')}
                  busca={
                    catalog?.buscar
                      ? {
                          consulta: catalog.consulta ?? '',
                          buscar: catalog.buscar,
                          atualizando: catalog.atualizando,
                        }
                      : undefined
                  }
                >
                  {catalog?.fase === 'carregando' && (
                    <p role="status">Carregando casas…</p>
                  )}
                  {catalog?.erro && (
                    <p role="alert">
                      {catalog.erro.replace(
                        'Seu filtro foi preservado.',
                        'Sua escolha foi preservada.',
                      )}
                    </p>
                  )}
                  {catalog?.fase === 'pronto' && !catalog.options.length && (
                    <p>Nenhuma casa encontrada. Tente outra busca.</p>
                  )}
                  <div className="acoes">
                    {catalog?.anterior && (
                      <button type="button" onClick={catalog.anterior}>
                        Casas anteriores
                      </button>
                    )}
                    {catalog?.proxima && (
                      <button type="button" onClick={catalog.proxima}>
                        Próximas casas
                      </button>
                    )}
                    {catalog?.erro && catalog.tentar && (
                      <button type="button" onClick={catalog.tentar}>
                        Consultar casas novamente
                      </button>
                    )}
                  </div>
                </EscolhaFiltro>
              </div>
              {CAMPOS.slice(0, 2).map(([key, label]) => input(key, label))}
            </div>
            <label className="nova-check">
              <input
                type="checkbox"
                checked={form.freebet}
                onChange={(e) => update('freebet', e.target.checked)}
              />
              Esta aposta é uma freebet
            </label>
            <p className="nova-ajuda">
              Informe o valor de face em unidades, inclusive na freebet. Os
              valores em dinheiro são definidos pelo serviço.
            </p>
            <details>
              <summary>Evento e outros detalhes (opcional)</summary>
              <div className="nova-campos">
                {CAMPOS.slice(2).map(([key, label]) => input(key, label))}
              </div>
              <p className="nova-ajuda">
                Sem data/hora da aposta, será usado o instante do primeiro
                registro. A unidade vigente é definida pelo serviço. A data do
                jogo orienta a conta.
              </p>
              <EscolhaFiltro
                id="nova-conta"
                label="Conta que fez a aposta"
                value={form.conta}
                resetLabel="Atribuir pela data do jogo"
                selectedLabel={
                  !form.conta ? 'Atribuir pela data do jogo' : undefined
                }
                disabled={
                  !form.casa ||
                  !consultableHouse ||
                  matrix.isFetching ||
                  !!matrix.error ||
                  matrixWait
                }
                options={
                  matrix.data?.contas.map((c) => ({
                    value: String(c.conta_casa_id),
                    label: `${c.apelido} — ${c.titular_nome ?? 'Sem titular'} · ${c.estado.toLowerCase().replaceAll('_', ' ')}`,
                  })) ?? []
                }
                onChange={(value) => update('conta', value)}
              />
              {matrix.isPending && form.casa && consultableHouse && (
                <p role="status">Carregando contas…</p>
              )}
              {form.casa && !consultableHouse && (
                <p>
                  As contas desta casa não estão disponíveis neste formulário.
                  Sem escolha explícita, a atribuição será conferida pelo
                  serviço.
                </p>
              )}
              {matrix.data && !matrix.data.contas.length && (
                <p>
                  Não há contas desta casa. O registro poderá precisar de
                  Revisão.
                </p>
              )}
              {matrix.error && (
                <ErroApi
                  error={matrix.error}
                  intent="leitura"
                  actions={{
                    tentar: () => {
                      if (!matrixWait && !matrix.isFetching)
                        void matrix.refetch();
                    },
                  }}
                />
              )}
              <p className="nova-ajuda">
                A escolha explícita identifica quem fez esta aposta, incluindo
                contas históricas. Sem conta escolhida, o serviço confere o dia
                do jogo e encaminha ausências ou ambiguidades para Revisão.
              </p>
            </details>
            {localError && <p role="alert">{localError}</p>}
            <div className="acoes">
              <button
                type="submit"
                className="botao-primario"
                disabled={!op.can(POST)}
              >
                {sending || op.busy
                  ? 'Registrando aposta…'
                  : 'Registrar aposta'}
              </button>
            </div>
          </fieldset>
        </form>
        <aside className="nova-nota">
          <h2>Um registro por aposta</h2>
          <p>
            Você informa odd e unidades. O serviço aplica a unidade vigente e
            calcula os valores financeiros.
          </p>
          <p>
            Se faltar contexto para atribuir a conta, a aposta será registrada
            com um aviso para Revisão.
          </p>
          <p>
            Os filtros da lista serão preservados ao voltar; eles não preenchem
            os campos desta aposta.
          </p>
          {!op.can(POST) && (
            <p>
              O registro exige acesso de escrita. Sua conta continua disponível
              para consulta.
            </p>
          )}
        </aside>
      </div>
    </main>
  );
}

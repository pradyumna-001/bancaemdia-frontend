import { useEffect, useRef, useState, type FormEvent } from 'react';
import {
  keepPreviousData,
  useQueries,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import type { createApiClient } from '../../api/client';
import { ApiError } from '../../api/error';
import { useAuth } from '../../auth/ProvedorAuth';
import { ErroApi } from '../../components/ErroApi';
import { EscolhaFiltro } from '../../components/filtros/EscolhaFiltro';
import { quantidade, valorNativo } from '../../lib/format';
import { lerFiltros } from '../../lib/params';
import { SITE_READ_CONTRACT } from '../../api/site-read.generated';
import { useAcesso } from '../acesso/ProvedorAcesso';
import { useCatalogos } from '../apostas/catalogos';
import { validar } from '../contas/protocol';
import { instanteDaEntrada } from './protocol';
import {
  APELIDO_MAXIMO,
  APOSTAS_NATIVAS,
  CONTAS_NATIVAS,
  LIMITE_LISTA,
  MOEDAS,
  POST_CONTA_NATIVA,
  RESUMO_NATIVO,
  conferirApostas,
  conferirContas,
  conferirCriada,
  conferirResumo,
  instante,
  type ContaNativa,
  type Moeda,
  type NovaContaNativa,
} from './nativo';

const PASSO = 20;
const ROTULO_MOEDA: Record<Moeda, string> = { BRL: 'Real (BRL)', USDT: 'USDT' };
const ESTADO: Record<'GREEN' | 'RED', string> = { GREEN: 'Green', RED: 'Red' };

type Rascunho = {
  casa: string;
  moeda?: Moeda;
  apelido: string;
  desde: string;
  ate: string;
};
const vazio: Rascunho = { casa: '', apelido: '', desde: '', ate: '' };

type Fase = 'idle' | 'enviando' | 'incerto';

function instanteOuNada(texto: string): string | undefined {
  try {
    return instanteDaEntrada(texto);
  } catch {
    return undefined;
  }
}

// Native-currency accounts, bets and totals (#128). Amounts stay in their own
// currency as exact text; nothing is converted to reais or summed across
// currencies, and the combined total is never filled in by the client.
export function OutrasMoedas({
  client,
}: {
  client: ReturnType<typeof createApiClient>;
}) {
  const auth = useAuth()!;
  const access = useAcesso()!;
  const queries = useQueryClient();
  const epoch = auth.state.privateEpoch;
  const pessoa = auth.state.person?.id;
  const ativo = auth.state.phase === 'authenticated';
  const [limite, setLimite] = useState(PASSO);
  const [aberto, setAberto] = useState(false);
  const [form, setForm] = useState<Rascunho>(vazio);
  const [invalido, setInvalido] = useState('');
  const [fase, setFase] = useState<Fase>('idle');
  const [erro, setErro] = useState<unknown>();
  const [criada, setCriada] = useState<ContaNativa>();
  const [consultada, setConsultada] = useState(false);
  const enviando = useRef(false);
  const alive = useRef(false);

  useEffect(() => {
    alive.current = true;
    const unregister = auth.service.registerCleanup(() => {
      setForm(vazio);
      setAberto(false);
      setFase('idle');
      setErro(undefined);
      setCriada(undefined);
    });
    return () => {
      alive.current = false;
      unregister();
    };
  }, [auth.service]);

  const contas = useQuery({
    queryKey: ['caixa', epoch, 'nativo', 'contas', pessoa],
    enabled: ativo,
    retryOnMount: false,
    queryFn: ({ signal }) =>
      auth.service.read(async () =>
        conferirContas((await client.GET(CONTAS_NATIVAS, { signal })).data),
      ),
  });
  const resumo = useQuery({
    queryKey: ['caixa', epoch, 'nativo', 'resumo', pessoa],
    enabled: ativo,
    retryOnMount: false,
    queryFn: ({ signal }) =>
      auth.service.read(async () =>
        conferirResumo((await client.GET(RESUMO_NATIVO, { signal })).data),
      ),
  });
  const apostas = useQuery({
    queryKey: ['caixa', epoch, 'nativo', 'apostas', pessoa, limite],
    enabled: ativo,
    retryOnMount: false,
    placeholderData: keepPreviousData,
    queryFn: ({ signal }) =>
      auth.service.read(async () =>
        conferirApostas(
          (
            await client.GET(APOSTAS_NATIVAS, {
              signal,
              params: { query: { limit: limite } },
            })
          ).data,
        ),
      ),
  });

  // Casa names come from the same matrix the Caixa already reads.
  const casasIds = [...new Set(contas.data?.map((c) => c.casa_id) ?? [])];
  const matrizes = useQueries({
    queries: casasIds.map((casa) => ({
      queryKey: ['caixa', epoch, 'identificacao', casa],
      enabled: ativo,
      retryOnMount: false,
      refetchOnWindowFocus: false,
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        auth.service.read(async () => {
          const value = validar(
            (
              await client.GET('/api/v1/titulares/casas/{casa_id}/matriz', {
                signal,
                params: { path: { casa_id: casa } },
              })
            ).data,
            '/api/v1/titulares/casas/{casa_id}/matriz',
          );
          if (value.casa_id !== casa) throw new ApiError('invalid_response');
          return value;
        }),
    })),
  });
  const nomeCasa = (casa: number) =>
    matrizes.find((q) => q.data?.casa_id === casa)?.data?.casa_nome ??
    `Casa ${casa}`;
  const nomeConta = (contaId: number | null) => {
    if (contaId === null) return 'Sem conta atribuída';
    const c = contas.data?.find((item) => item.id === contaId);
    return c ? `${c.label} · ${nomeCasa(c.casa_id)}` : `Conta ${contaId}`;
  };

  const busca = new URLSearchParams();
  if (form.casa) busca.set('casa', form.casa);
  const catalogo = useCatalogos(
    SITE_READ_CONTRACT,
    client,
    lerFiltros(busca),
    ['casa'],
    aberto,
  ).casa;

  const podeCriar = access.can(POST_CONTA_NATIVA);
  const bloqueado = fase !== 'idle' || !podeCriar;

  function ler(): NovaContaNativa | string {
    const casa = Number(form.casa);
    if (!Number.isSafeInteger(casa) || casa <= 0) return 'Escolha a casa.';
    if (!form.moeda) return 'Escolha a moeda da conta.';
    const label = form.apelido.trim();
    if (!label || label.length > APELIDO_MAXIMO)
      return `Informe um apelido de 1 a ${APELIDO_MAXIMO} caracteres.`;
    const desde = instanteOuNada(form.desde);
    if (!desde)
      return 'Informe o início da vigência com data, hora e fuso, como 01/10/2026 00:00-03:00.';
    const ate = form.ate.trim() ? instanteOuNada(form.ate) : null;
    if (form.ate.trim() && !ate)
      return 'Informe o fim da vigência com data, hora e fuso, ou deixe em branco.';
    if (ate && Date.parse(ate) <= Date.parse(desde))
      return 'O fim da vigência precisa ser depois do início.';
    return {
      casa_id: casa,
      currency: form.moeda,
      label,
      valid_from: desde,
      ...(ate ? { valid_to: ate } : {}),
    };
  }

  async function criar(event: FormEvent) {
    event.preventDefault();
    if (enviando.current || bloqueado) return;
    const pedido = ler();
    if (typeof pedido === 'string') return setInvalido(pedido);
    setInvalido('');
    enviando.current = true;
    setFase('enviando');
    setErro(undefined);
    setCriada(undefined);
    setConsultada(false);
    const scope = auth.service.capture();
    let enviado = false;
    try {
      // No idempotency is published for this POST: it is sent once and never
      // repeated, by the client or by a session retry (rule 21).
      const resultado = await access.run(POST_CONTA_NATIVA, async () => {
        enviado = true;
        const { data } = await client.POST(CONTAS_NATIVAS, { body: pedido });
        return conferirCriada(data, pedido);
      });
      if (!alive.current || !scope.isCurrent()) return;
      setCriada(resultado);
      setForm(vazio);
      setAberto(false);
      setFase('idle');
      await queries.invalidateQueries({
        queryKey: ['caixa', epoch, 'nativo'],
      });
    } catch (cause) {
      if (!alive.current) return;
      const failure =
        cause instanceof ApiError
          ? cause
          : new ApiError('invalid_response', { mutation: true });
      setErro(failure);
      setFase(
        enviado &&
          (failure.outcomeUnknown ||
            failure.kind === 'invalid_response' ||
            failure.status === 429)
          ? 'incerto'
          : 'idle',
      );
    } finally {
      enviando.current = false;
    }
  }

  async function consultarContas() {
    await contas.refetch();
    if (alive.current) setConsultada(true);
  }

  function encerrar() {
    // Closing does not cancel anything on the server; a new account starts empty.
    setFase('idle');
    setErro(undefined);
    setForm(vazio);
    setAberto(false);
    setConsultada(false);
  }

  const totais = resumo.data ?? [];
  const lista = apostas.data ?? [];

  return (
    <section aria-labelledby="nativo-titulo" className="caixa-nativo">
      <h2 id="nativo-titulo">Outras moedas</h2>
      <p className="legenda">
        Contas, apostas e totais na moeda de origem, como USDT. Os valores não
        são convertidos para reais nem somados entre moedas.
      </p>

      <section aria-labelledby="nativo-resumo-titulo">
        <h3 id="nativo-resumo-titulo">Totais por moeda</h3>
        <p className="legenda">
          Todo o histórico, pelo dia do jogo. Apostas em revisão ficam fora dos
          totais.
        </p>
        {resumo.isPending && <p role="status">Consultando totais…</p>}
        {resumo.error && (
          <ErroApi
            error={resumo.error}
            intent="leitura"
            actions={{ tentar: () => void resumo.refetch() }}
          />
        )}
        {resumo.data && !totais.length && (
          <p>Ainda não há apostas em outras moedas nos totais.</p>
        )}
        {totais.length > 0 && (
          <table className="nativo-tabela">
            <caption className="somente-leitor">Totais por moeda</caption>
            <thead>
              <tr>
                <th scope="col">Moeda</th>
                <th scope="col">Apostas</th>
                <th scope="col">Apostado</th>
                <th scope="col">Retorno</th>
                <th scope="col">Resultado</th>
              </tr>
            </thead>
            <tbody>
              {totais.map((t) => (
                <tr key={t.currency}>
                  <th scope="row">{ROTULO_MOEDA[t.currency]}</th>
                  <td className="numero">{quantidade(t.bets)}</td>
                  <td className="numero">{valorNativo(t.stake, t.currency)}</td>
                  <td className="numero">
                    {valorNativo(t.returned, t.currency)}
                  </td>
                  <td className="numero">
                    {valorNativo(t.profit, t.currency, true)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section aria-labelledby="nativo-contas-titulo">
        <h3 id="nativo-contas-titulo">Contas em outras moedas</h3>
        <p className="legenda">
          A conta de cada aposta é escolhida pelo dia do jogo dentro da
          vigência. Contas com vigências sobrepostas são permitidas; nesse caso
          a aposta fica em revisão.
        </p>
        {contas.isPending && <p role="status">Consultando contas…</p>}
        {contas.error && (
          <ErroApi
            error={contas.error}
            intent="leitura"
            actions={{ tentar: () => void contas.refetch() }}
          />
        )}
        {contas.data && !contas.data.length && (
          <p>Nenhuma conta em outra moeda. Crie uma para receber apostas.</p>
        )}
        {!!contas.data?.length && (
          <ul className="nativo-contas">
            {contas.data.map((c) => (
              <li key={c.id}>
                <strong>{c.label}</strong> · {nomeCasa(c.casa_id)} ·{' '}
                {ROTULO_MOEDA[c.currency]}
                <span className="legenda">
                  {' '}
                  Vigência de {instante(c.valid_from)}{' '}
                  {c.valid_to ? `até ${instante(c.valid_to)}` : 'sem fim'}
                  {c.active ? '' : ' · inativa'}
                </span>
              </li>
            ))}
          </ul>
        )}

        {criada && (
          <p role="status">
            Conta {criada.label} em {ROTULO_MOEDA[criada.currency]} criada.
          </p>
        )}
        {fase === 'incerto' && (
          <div role="status" className="nativo-incerto">
            <p>
              Não foi possível confirmar se a conta foi criada. Este pedido não
              tem consulta própria e não será reenviado. Consulte a lista de
              contas antes de criar outra.
            </p>
            <button type="button" onClick={() => void consultarContas()}>
              Consultar contas
            </button>
            {consultada && (
              <p>
                Lista consultada. Ela não confirma o resultado daquele pedido.
              </p>
            )}
            <button type="button" onClick={encerrar}>
              Encerrar este acompanhamento
            </button>
          </div>
        )}
        {fase === 'idle' && erro !== undefined && (
          <ErroApi
            error={erro}
            intent="gravacao"
            fields={[
              {
                scope: 'body',
                field: 'casa_id',
                label: 'Casa',
                id: 'nativo-casa',
              },
              {
                scope: 'body',
                field: 'label',
                label: 'Apelido',
                id: 'nativo-apelido',
              },
              {
                scope: 'body',
                field: 'valid_from',
                label: 'Início da vigência',
                id: 'nativo-desde',
              },
              {
                scope: 'body',
                field: 'valid_to',
                label: 'Fim da vigência',
                id: 'nativo-ate',
              },
            ]}
          />
        )}

        {aberto ? (
          <form className="nativo-form" onSubmit={(e) => void criar(e)}>
            <EscolhaFiltro
              id="nativo-casa"
              onOpen={catalogo?.abrir}
              dentroDeFormulario
              label="Casa"
              value={form.casa}
              options={catalogo?.options ?? []}
              selectedLabel={
                catalogo?.selecionada?.label ??
                (form.casa ? 'Casa selecionada' : 'Escolha a casa')
              }
              resetLabel="Escolher depois"
              disabled={bloqueado}
              onChange={(v) => setForm({ ...form, casa: v ?? '' })}
              busca={
                catalogo?.buscar
                  ? {
                      consulta: catalogo.consulta ?? '',
                      buscar: catalogo.buscar,
                      atualizando: catalogo.atualizando,
                    }
                  : undefined
              }
            >
              {catalogo?.fase === 'carregando' && (
                <p role="status">Carregando casas…</p>
              )}
              {catalogo?.erro && <p role="alert">{catalogo.erro}</p>}
              {catalogo?.fase === 'pronto' && !catalogo.options.length && (
                <p>Nenhuma casa encontrada. Tente outra busca.</p>
              )}
            </EscolhaFiltro>
            <fieldset disabled={bloqueado}>
              <legend>Moeda</legend>
              {MOEDAS.map((m) => (
                <label key={m}>
                  <input
                    type="radio"
                    name="nativo-moeda"
                    checked={form.moeda === m}
                    onChange={() => setForm({ ...form, moeda: m })}
                  />{' '}
                  {ROTULO_MOEDA[m]}
                </label>
              ))}
            </fieldset>
            <label htmlFor="nativo-apelido">Apelido</label>
            <input
              id="nativo-apelido"
              value={form.apelido}
              maxLength={APELIDO_MAXIMO}
              autoComplete="off"
              disabled={bloqueado}
              onChange={(e) => setForm({ ...form, apelido: e.target.value })}
            />
            <label htmlFor="nativo-desde">Início da vigência (com fuso)</label>
            <input
              id="nativo-desde"
              value={form.desde}
              placeholder="01/10/2026 00:00-03:00"
              autoComplete="off"
              disabled={bloqueado}
              onChange={(e) => setForm({ ...form, desde: e.target.value })}
            />
            <label htmlFor="nativo-ate">Fim da vigência (opcional)</label>
            <input
              id="nativo-ate"
              value={form.ate}
              autoComplete="off"
              disabled={bloqueado}
              onChange={(e) => setForm({ ...form, ate: e.target.value })}
            />
            {invalido && <p role="alert">{invalido}</p>}
            <div className="banca-acoes">
              <button type="submit" disabled={bloqueado}>
                {fase === 'enviando' ? 'Criando conta…' : 'Criar conta'}
              </button>
              <button
                type="button"
                disabled={fase === 'enviando'}
                onClick={() => {
                  setAberto(false);
                  setInvalido('');
                }}
              >
                Cancelar
              </button>
            </div>
          </form>
        ) : (
          fase === 'idle' && (
            <button
              type="button"
              disabled={!podeCriar}
              onClick={() => {
                setCriada(undefined);
                setErro(undefined);
                setAberto(true);
              }}
            >
              Conta em outra moeda
            </button>
          )
        )}
        {!podeCriar && (
          <p className="legenda">
            Com a conta em modo de leitura, as contas podem ser consultadas, mas
            não criadas.
          </p>
        )}
      </section>

      <section aria-labelledby="nativo-apostas-titulo">
        <h3 id="nativo-apostas-titulo">Apostas em outras moedas</h3>
        <p className="legenda">
          Até {quantidade(limite)} apostas retornadas pela API, com os valores
          exatos da origem. Esta lista não é o histórico completo.
        </p>
        {apostas.isPending && <p role="status">Consultando apostas…</p>}
        {apostas.error && (
          <ErroApi
            error={apostas.error}
            intent="leitura"
            actions={{ tentar: () => void apostas.refetch() }}
          />
        )}
        {apostas.data && !lista.length && (
          <p>Nenhuma aposta em outra moeda foi recebida.</p>
        )}
        {lista.length > 0 && (
          <ul className="nativo-apostas">
            {lista.map((a) => (
              <li key={a.id}>
                <article aria-label={`Aposta ${a.id}`}>
                  <p>
                    <strong>{ESTADO[a.state]}</strong> · jogo em{' '}
                    {instante(a.game_at)} · {nomeConta(a.account_id)}
                  </p>
                  <dl>
                    <div>
                      <dt>Apostado</dt>
                      <dd className="numero">
                        {valorNativo(a.stake, a.currency)}
                      </dd>
                    </div>
                    <div>
                      <dt>Retorno</dt>
                      <dd className="numero">
                        {valorNativo(a.returned, a.currency)}
                      </dd>
                    </div>
                    <div>
                      <dt>Resultado</dt>
                      <dd className="numero">
                        {valorNativo(a.profit, a.currency, true)}
                      </dd>
                    </div>
                  </dl>
                  {a.needs_review && (
                    <p className="legenda">
                      Em revisão: fica fora dos totais até a conta ou o conteúdo
                      serem revistos. A API ainda não oferece essa revisão pelo
                      site.
                    </p>
                  )}
                </article>
              </li>
            ))}
          </ul>
        )}
        {lista.length >= limite && limite < LIMITE_LISTA && (
          <button
            type="button"
            disabled={apostas.isFetching}
            onClick={() => setLimite(Math.min(LIMITE_LISTA, limite + PASSO))}
          >
            Mostrar mais
          </button>
        )}
      </section>
    </section>
  );
}

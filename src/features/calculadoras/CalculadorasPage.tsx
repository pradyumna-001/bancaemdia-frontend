import { useEffect, useRef, useState } from 'react';
import {
  Link,
  useLocation,
  useNavigation,
  useSearchParams,
} from 'react-router-dom';
import { getApiClient, type createApiClient } from '../../api/client';
import { ApiError } from '../../api/error';
import { useAuth } from '../../auth/ProvedorAuth';
import { useAcesso } from '../acesso/ProvedorAcesso';
import { ErroApi } from '../../components/ErroApi';
import { useRetryAfter } from '../../lib/useRetryAfter';
import {
  TOOLS,
  toolFromUrl,
  decimalInput,
  moneyInput,
  presentCalculation,
  type Calculation,
  type Tool,
} from './protocol';
import './calculadoras.css';

type Entry = { id: number; name: string; odd: string };
type Fields = {
  total: string;
  original: string;
  originalOdd: string;
  opposingOdd: string;
  commission: string;
  bankroll: string;
  percentage: string;
  stake: string;
};
const emptyFields: Fields = {
  total: '',
  original: '',
  originalOdd: '',
  opposingOdd: '',
  commission: '0',
  bankroll: '',
  percentage: '',
  stake: '',
};

export function CalculadorasPage({
  client,
}: {
  client?: ReturnType<typeof createApiClient>;
}) {
  const auth = useAuth();
  const access = useAcesso();
  const [search] = useSearchParams();
  const navigating = useNavigation().state !== 'idle';
  const location = useLocation();
  const tool = toolFromUrl(search.get('ferramenta'));
  const [entries, setEntries] = useState<Entry[]>([
    { id: 1, name: '', odd: '' },
    { id: 2, name: '', odd: '' },
  ]);
  const nextId = useRef(3);
  const [removedEntry, setRemovedEntry] = useState<{
    entry: Entry;
    index: number;
  }>();
  const [fields, setFields] = useState(emptyFields);
  const [mode, setMode] = useState<'direct' | 'inverse'>('direct');
  const [complete, setComplete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const [validation, setValidation] = useState('');
  const [error, setError] = useState<unknown>();
  const [limitError, setLimitError] = useState<unknown>();
  const waiting = useRetryAfter(limitError);
  const [result, setResult] = useState<ReturnType<typeof presentCalculation>>();
  const request = useRef<AbortController>();
  const revision = useRef({ value: 0 });
  const title = useRef<HTMLHeadingElement>(null);
  const validationRef = useRef<HTMLParagraphElement>(null);
  const pending = useRef(false);
  const clear = () => {
    revision.current.value++;
    request.current?.abort();
    pending.current = false;
    setBusy(false);
    setUncertain(false);
    setResult(undefined);
    setError(undefined);
    setValidation('');
  };
  useEffect(() => {
    const counter = revision.current;
    counter.value++;
    request.current?.abort();
    pending.current = false;
    setBusy(false);
    setUncertain(false);
    setResult(undefined);
    setError(undefined);
    setValidation('');
    return () => {
      counter.value++;
      request.current?.abort();
      pending.current = false;
    };
  }, [tool]);
  useEffect(() => {
    if (validation) validationRef.current?.focus();
  }, [validation]);
  useEffect(() => {
    if (result) title.current?.focus();
  }, [result]);
  const changeField = (key: keyof Fields, value: string) => {
    clear();
    setFields((previous) => ({ ...previous, [key]: value }));
  };
  const market =
    tool === 'mercado-justo' || tool === 'distribuir-entre-resultados';
  const submit = async () => {
    if (
      pending.current ||
      uncertain ||
      navigating ||
      waiting ||
      !auth ||
      auth.state.phase !== 'authenticated' ||
      !access?.can(`POST /api/v1/calculadoras/${tool}`)
    )
      return;
    clear();
    const controller = new AbortController();
    request.current = controller;
    const version = revision.current.value;
    const scope = auth.service.capture();
    const api = client ?? getApiClient();
    let work: () => Promise<Calculation | undefined>;
    try {
      if (market) {
        if (!complete)
          throw new Error(
            'Confirme que informou todos os resultados distintos do mercado.',
          );
        const outcomes = entries.map((entry) => ({
          name: entry.name.trim(),
          odd: decimalInput(entry.odd),
        }));
        if (
          outcomes.some((entry) => !entry.name || entry.name.length > 80) ||
          new Set(
            outcomes.map((entry) => entry.name.toLocaleLowerCase('pt-BR')),
          ).size !== outcomes.length
        )
          throw new Error(
            'Informe nomes distintos, com até 80 caracteres, para todos os resultados.',
          );
        if (tool === 'mercado-justo')
          work = async () =>
            (
              await api.POST('/api/v1/calculadoras/mercado-justo', {
                body: { outcomes },
                signal: controller.signal,
              })
            ).data;
        else {
          const body = {
            outcomes,
            total_stake_centavos: moneyInput(fields.total),
          };
          work = async () =>
            (
              await api.POST(
                '/api/v1/calculadoras/distribuir-entre-resultados',
                { body, signal: controller.signal },
              )
            ).data;
        }
      } else if (tool === 'cobertura-ao-vivo') {
        const body = {
          original_stake_centavos: moneyInput(fields.original),
          original_odd: decimalInput(fields.originalOdd),
          opposing_odd: decimalInput(fields.opposingOdd),
          commission_percentage: decimalInput(fields.commission),
          stake_type: 'cash',
          market_type: 'two_way',
        } as const;
        work = async () =>
          (
            await api.POST('/api/v1/calculadoras/cobertura-ao-vivo', {
              body,
              signal: controller.signal,
            })
          ).data;
      } else {
        const body = {
          bankroll_centavos: moneyInput(fields.bankroll),
          ...(mode === 'direct'
            ? { percentage: decimalInput(fields.percentage) }
            : { stake_centavos: moneyInput(fields.stake, true) }),
        };
        work = async () =>
          (
            await api.POST('/api/v1/calculadoras/percentual-banca', {
              body,
              signal: controller.signal,
            })
          ).data;
      }
    } catch (failure) {
      setValidation(
        failure instanceof Error
          ? failure.message
          : 'Confira os campos informados.',
      );
      return;
    }
    pending.current = true;
    setBusy(true);
    try {
      const data = await access.run(`POST /api/v1/calculadoras/${tool}`, work);
      if (
        controller.signal.aborted ||
        version !== revision.current.value ||
        !scope.isCurrent()
      )
        return;
      if (!data) throw new ApiError('invalid_response', { mutation: true });
      const presentation = presentCalculation(tool, data);
      if (
        market &&
        (presentation.rows.length !== entries.length ||
          presentation.rows.some(
            (row, index) => row[0] !== entries[index]!.name.trim(),
          ))
      )
        throw new ApiError('invalid_response', { mutation: true });
      setResult(presentation);
    } catch (failure) {
      if (
        controller.signal.aborted ||
        version !== revision.current.value ||
        !scope.isCurrent()
      )
        return;
      const safe =
        failure instanceof ApiError
          ? failure
          : new ApiError('invalid_response', { mutation: true });
      setError(safe);
      setLimitError(safe);
      setUncertain(safe.outcomeUnknown || safe.status === 409);
    } finally {
      if (version === revision.current.value && scope.isCurrent()) {
        pending.current = false;
        setBusy(false);
      }
    }
  };
  const input = (key: keyof Fields, label: string, hint: string) => (
    <div className="calculadora-campo">
      <label htmlFor={`calc-${key}`}>{label}</label>
      <p id={`calc-${key}-ajuda`} className="calculadora-ajuda">
        {hint}
      </p>
      <input
        id={`calc-${key}`}
        inputMode="decimal"
        autoComplete="off"
        maxLength={22}
        aria-describedby={`calc-${key}-ajuda`}
        value={fields[key]}
        onChange={(event) => changeField(key, event.target.value)}
      />
    </div>
  );
  const toolLink = (next: Tool) => {
    const params = new URLSearchParams(search);
    params.set('ferramenta', next);
    return `${location.pathname}?${params}`;
  };
  return (
    <main className="pagina calculadoras">
      <header>
        <p className="legenda">Ferramentas</p>
        <h1>Calculadoras</h1>
        <p>
          Informe as entradas. O serviço calcula os cenários; nenhum valor é
          salvo como aposta.
        </p>
      </header>
      <nav className="calculadoras-escolha" aria-label="Escolha a ferramenta">
        {(Object.keys(TOOLS) as Tool[]).map((key) => (
          <Link
            key={key}
            to={toolLink(key)}
            aria-current={tool === key ? 'page' : undefined}
            onClick={() => {
              if (key !== tool) clear();
            }}
          >
            {TOOLS[key].title}
          </Link>
        ))}
      </nav>
      <section aria-labelledby="calculadora-titulo">
        <h2 id="calculadora-titulo">{TOOLS[tool].title}</h2>
        <p>{TOOLS[tool].description}</p>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
          noValidate
        >
          {market && (
            <>
              <p className="calculadora-ajuda">
                Informe de 2 a 20 resultados que não possam acontecer juntos,
                incluindo empate quando existir. Odds decimais maiores que 1,
                sem separador de milhares.
              </p>
              {entries.map((entry, index) => (
                <fieldset
                  className="calculadora-resultado-entrada"
                  key={entry.id}
                >
                  <legend>Resultado {index + 1}</legend>
                  <div className="calculadora-campos">
                    <div className="calculadora-campo">
                      <label htmlFor={`nome-${entry.id}`}>
                        Nome do resultado {index + 1}
                      </label>
                      <input
                        id={`nome-${entry.id}`}
                        maxLength={80}
                        autoComplete="off"
                        value={entry.name}
                        onChange={(event) => {
                          clear();
                          setEntries((previous) =>
                            previous.map((item) =>
                              item.id === entry.id
                                ? { ...item, name: event.target.value }
                                : item,
                            ),
                          );
                        }}
                      />
                    </div>
                    <div className="calculadora-campo">
                      <label htmlFor={`odd-${entry.id}`}>
                        Odd do resultado {index + 1}
                      </label>
                      <input
                        id={`odd-${entry.id}`}
                        inputMode="decimal"
                        autoComplete="off"
                        maxLength={22}
                        value={entry.odd}
                        onChange={(event) => {
                          clear();
                          setEntries((previous) =>
                            previous.map((item) =>
                              item.id === entry.id
                                ? { ...item, odd: event.target.value }
                                : item,
                            ),
                          );
                        }}
                      />
                    </div>
                  </div>
                  {entries.length > 2 && (
                    <button
                      className="calculadora-secundario"
                      type="button"
                      onClick={() => {
                        clear();
                        setRemovedEntry({ entry, index });
                        setEntries((previous) =>
                          previous.filter((item) => item.id !== entry.id),
                        );
                      }}
                      aria-label={`Remover resultado ${index + 1}`}
                    >
                      Remover resultado
                    </button>
                  )}
                </fieldset>
              ))}
              <button
                className="calculadora-secundario"
                type="button"
                disabled={entries.length >= 20}
                onClick={() => {
                  clear();
                  const entry = { id: nextId.current++, name: '', odd: '' };
                  setEntries((previous) => [...previous, entry]);
                }}
              >
                Adicionar resultado
              </button>
              {removedEntry && (
                <div className="acoes">
                  <p role="status">Resultado removido do formulário.</p>
                  <button
                    className="calculadora-secundario"
                    type="button"
                    disabled={entries.length >= 20}
                    onClick={() => {
                      clear();
                      setEntries((previous) => [
                        ...previous.slice(0, removedEntry.index),
                        removedEntry.entry,
                        ...previous.slice(removedEntry.index),
                      ]);
                      setRemovedEntry(undefined);
                    }}
                  >
                    Desfazer remoção
                  </button>
                </div>
              )}
              <label className="calculadora-confirmar">
                <input
                  type="checkbox"
                  checked={complete}
                  onChange={(event) => {
                    clear();
                    setComplete(event.target.checked);
                  }}
                />
                <span>Informei todos os resultados distintos do mercado.</span>
              </label>
              {tool === 'distribuir-entre-resultados' &&
                input(
                  'total',
                  'Entrada total (R$)',
                  'Valor que deseja distribuir. Use vírgula para os centavos, sem separador de milhares.',
                )}
            </>
          )}
          {tool === 'cobertura-ao-vivo' && (
            <>
              <p className="calculadora-ajuda">
                Somente mercado de dois resultados e aposta em dinheiro.
                Freebet, cashout parcial e devoluções asiáticas não são
                suportados. As odds precisam estar disponíveis para apostar.
              </p>
              <div className="calculadora-campos">
                {input(
                  'original',
                  'Entrada original (R$)',
                  'Valor em dinheiro da aposta original. Use vírgula para os centavos.',
                )}
                {input(
                  'originalOdd',
                  'Odd original',
                  'Odd decimal maior que 1.',
                )}
                {input(
                  'opposingOdd',
                  'Odd oposta',
                  'Odd decimal maior que 1, para o outro resultado.',
                )}
                {input(
                  'commission',
                  'Comissão (%)',
                  'De 0 a menos de 100. Incide sobre o lucro da aposta vencedora.',
                )}
              </div>
            </>
          )}
          {tool === 'percentual-banca' && (
            <>
              {input(
                'bankroll',
                'Banca informada (R$)',
                'Digite o valor que quer usar. Nenhum saldo de conta é escolhido automaticamente.',
              )}
              <fieldset className="calculadoras-escolha">
                <legend>O que deseja consultar?</legend>
                <label>
                  <input
                    type="radio"
                    name="modo"
                    checked={mode === 'direct'}
                    onChange={() => {
                      clear();
                      setMode('direct');
                    }}
                  />
                  Valor a partir do percentual
                </label>
                <label>
                  <input
                    type="radio"
                    name="modo"
                    checked={mode === 'inverse'}
                    onChange={() => {
                      clear();
                      setMode('inverse');
                    }}
                  />
                  Percentual a partir do valor
                </label>
              </fieldset>
              {mode === 'direct'
                ? input(
                    'percentage',
                    'Percentual (%)',
                    'De 0 a 100, com até oito casas decimais.',
                  )
                : input(
                    'stake',
                    'Valor da entrada (R$)',
                    'Pode ser zero; não deve ultrapassar a banca informada.',
                  )}
            </>
          )}
          {validation && (
            <p
              ref={validationRef}
              tabIndex={-1}
              role="alert"
              className="calculadora-validacao"
            >
              {validation}
            </p>
          )}
          <div className="acoes">
            <button
              disabled={
                busy ||
                uncertain ||
                navigating ||
                waiting ||
                !access?.can(`POST /api/v1/calculadoras/${tool}`)
              }
            >
              {busy ? 'Consultando…' : 'Consultar resultado'}
            </button>
            {busy && (
              <button
                type="button"
                onClick={() => {
                  clear();
                  setUncertain(true);
                }}
              >
                Parar consulta
              </button>
            )}
          </div>
          {waiting && (
            <p role="status">
              Aguarde o prazo informado pelo serviço antes de consultar
              novamente.
            </p>
          )}
          {uncertain && (
            <p role="status">
              Esta consulta terminou sem uma resposta confirmada. Altere uma
              entrada para iniciar outra consulta.
            </p>
          )}
        </form>
      </section>
      {error !== undefined && (
        <ErroApi
          error={error}
          intent="gravacao"
          destination={location.pathname + location.search}
          actions={{
            revisar: () =>
              document
                .querySelector<HTMLInputElement>('.calculadoras form input')
                ?.focus(),
          }}
          fields={[
            ...(market
              ? [
                  {
                    scope: 'body' as const,
                    field: 'outcomes',
                    id: `nome-${entries[0]!.id}`,
                    label: 'resultados e odds',
                  },
                ]
              : []),
            ...Object.keys(fields).map((key) => ({
              scope: 'body' as const,
              field: (
                {
                  total: 'total_stake_centavos',
                  original: 'original_stake_centavos',
                  originalOdd: 'original_odd',
                  opposingOdd: 'opposing_odd',
                  commission: 'commission_percentage',
                  bankroll: 'bankroll_centavos',
                  percentage: 'percentage',
                  stake: 'stake_centavos',
                } as const
              )[key as keyof Fields],
              id: `calc-${key}`,
              label: (
                {
                  total: 'entrada total',
                  original: 'entrada original',
                  originalOdd: 'odd original',
                  opposingOdd: 'odd oposta',
                  commission: 'comissão',
                  bankroll: 'banca informada',
                  percentage: 'percentual',
                  stake: 'valor da entrada',
                } as const
              )[key as keyof Fields],
            })),
          ]}
        />
      )}
      {result && (
        <section
          className="calculadora-resposta"
          aria-labelledby="resultado-titulo"
        >
          <h2 id="resultado-titulo" ref={title} tabIndex={-1}>
            Resultado informado pelo serviço
          </h2>
          <dl className="calculadora-metricas">
            {result.metrics.map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd className="numero">{value}</dd>
              </div>
            ))}
          </dl>
          {result.rows.length > 0 && (
            <div
              className="calculadora-tabela"
              // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- Região rolável precisa de foco para rolagem por teclado; coberta no e2e.
              tabIndex={0}
              role="region"
              aria-label="Cenários calculados; tabela com rolagem horizontal"
            >
              <table>
                <caption>
                  {tool === 'mercado-justo'
                    ? 'Resultados do mercado'
                    : 'Cenários de lucro ou perda'}
                </caption>
                <thead>
                  <tr>
                    {result.columns.map((column) => (
                      <th scope="col" key={column}>
                        {column}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.rows.map((row, index) => (
                    <tr key={index}>
                      {row.map((value, col) =>
                        col === 0 ? (
                          <th scope="row" key={col}>
                            {value}
                          </th>
                        ) : (
                          <td className="numero" key={col}>
                            {value}
                          </td>
                        ),
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {result.warnings.length > 0 && (
            <div className="calculadora-avisos">
              <h3>Atenção aos cenários</h3>
              <ul>
                {result.warnings.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            </div>
          )}
          <details>
            <summary>Premissas e método do serviço</summary>
            <p>
              <strong>Método:</strong> {result.method}
            </p>
            <p>
              <strong>Precisão:</strong> {result.precision}
            </p>
            <p>
              <strong>Arredondamento:</strong> {result.rounding}
            </p>
            {result.assumptions.length > 0 ? (
              <ul>
                {result.assumptions.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            ) : (
              <p>O serviço não informou premissas adicionais.</p>
            )}
          </details>
        </section>
      )}
      {!result && !busy && (
        <p className="calculadora-vazio">
          Preencha os campos e consulte para ver os cenários. Alterar uma
          entrada retira o resultado anterior.
        </p>
      )}
      <footer>
        <Link to={`/apostas${location.search}`}>Voltar para Apostas</Link>
      </footer>
    </main>
  );
}

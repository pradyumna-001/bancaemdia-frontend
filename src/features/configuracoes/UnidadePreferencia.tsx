import { useId, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getApiClient, type createApiClient } from '../../api/client';
import { useAuth } from '../../auth/ProvedorAuth';
import { ErroApi } from '../../components/ErroApi';
import { centavosDaEntrada, dataHora, moeda } from '../../lib/format';
import { UNIDADE, conferirUnidade, type Vigencia } from './unidade';
import { useUnidade } from './useUnidade';

function inicio(item: Vigencia, fuso: string): string {
  return item.vigente_de === null
    ? 'Desde o início'
    : dataHora(item.vigente_de, fuso);
}

export function UnidadePreferencia({
  client,
}: {
  client?: ReturnType<typeof createApiClient>;
}) {
  const auth = useAuth();
  const api = client ?? getApiClient();
  const inputId = useId();
  const [valor, setValor] = useState('');
  const [invalido, setInvalido] = useState('');
  const [pedido, setPedido] = useState<number>();
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const query = useQuery({
    queryKey: ['unidade', auth?.state.privateEpoch, auth?.state.person?.id],
    enabled: auth?.state.phase === 'authenticated',
    queryFn: ({ signal }) =>
      auth!.service.read(async () =>
        conferirUnidade((await api.GET(UNIDADE, { signal })).data),
      ),
    retryOnMount: false,
  });
  const escrita = useUnidade(api);
  const { state } = escrita;
  const unidade = query.data;
  const bloqueado =
    escrita.busy ||
    escrita.waiting ||
    !!state.uncertain ||
    !!state.notRecorded ||
    !escrita.canWrite ||
    !unidade;

  function revisar() {
    if (!unidade || bloqueado) return;
    try {
      const centavos = centavosDaEntrada(valor);
      if (centavos <= 0 || centavos > unidade.limite_centavos)
        throw new Error('fora do limite');
      setInvalido('');
      setPedido(centavos);
      dialog.current?.showModal();
    } catch {
      setInvalido(
        `Informe um valor em reais maior que zero e até ${moeda(unidade.limite_centavos)}.`,
      );
    }
  }
  function confirmar() {
    if (pedido === undefined) return;
    dialog.current?.close();
    void escrita.send({ valor_centavos: pedido });
  }

  return (
    <section className="configuracoes-card" aria-labelledby="unidade-titulo">
      <h2 id="unidade-titulo">Valor da unidade</h2>
      <p>
        A unidade converte o valor das apostas informadas em unidades. Uma nova
        unidade vale a partir do momento em que é salva; apostas já registradas
        mantêm a unidade com que foram criadas.
      </p>
      {query.isPending && <p role="status">Consultando a unidade…</p>}
      {query.error && (
        <ErroApi
          error={query.error}
          intent="leitura"
          actions={{ tentar: () => void query.refetch() }}
        />
      )}
      {unidade && (
        <>
          <p>
            Unidade agora:{' '}
            <strong className="numero">
              {moeda(unidade.vigente.valor_centavos)}
            </strong>{' '}
            {unidade.vigente.origem === 'padrao'
              ? '· valor padrão do serviço'
              : `· definida por você em ${inicio(unidade.vigente, unidade.fuso_horario)}`}
          </p>
          <p className="legenda">
            Valor padrão: {moeda(unidade.padrao_centavos)}. Limite:{' '}
            {moeda(unidade.limite_centavos)}. Datas no fuso{' '}
            {unidade.fuso_horario}.
          </p>
          {unidade.historico.length > 0 && (
            <table className="unidade-historico">
              <caption>Histórico de unidades</caption>
              <thead>
                <tr>
                  <th scope="col">Valor</th>
                  <th scope="col">Início</th>
                  <th scope="col">Fim</th>
                </tr>
              </thead>
              <tbody>
                {unidade.historico.map((item, index) => (
                  <tr key={item.id ?? `padrao-${index}`}>
                    <td className="numero">{moeda(item.valor_centavos)}</td>
                    <td>{inicio(item, unidade.fuso_horario)}</td>
                    <td>
                      {item.vigente_ate === null
                        ? 'Em vigor'
                        : dataHora(item.vigente_ate, unidade.fuso_horario)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <form
            onSubmit={(event) => {
              event.preventDefault();
              revisar();
            }}
          >
            <label htmlFor={inputId}>Nova unidade (R$)</label>
            <input
              id={inputId}
              inputMode="decimal"
              value={valor}
              aria-invalid={!!invalido}
              aria-describedby={invalido ? inputId + '-erro' : undefined}
              onChange={(event) => setValor(event.target.value)}
              disabled={bloqueado}
            />
            {invalido && (
              <p id={inputId + '-erro'} role="alert">
                {invalido}
              </p>
            )}
            <button ref={trigger} type="submit" disabled={bloqueado || !valor}>
              Revisar nova unidade
            </button>
          </form>
          {!escrita.canWrite && (
            <p className="legenda">
              Com a conta em modo de leitura, a unidade pode ser consultada, mas
              não alterada.
            </p>
          )}
        </>
      )}
      {state.receipt && (
        <p role="status">
          Unidade de {moeda(state.receipt.vigencia.valor_centavos)} salva. Vale
          a partir de{' '}
          {dataHora(state.receipt.vale_a_partir_de, state.receipt.fuso_horario)}
          ; nenhuma aposta existente foi alterada.
        </p>
      )}
      {escrita.error !== undefined && !state.receipt && !state.notRecorded && (
        <ErroApi
          error={escrita.error}
          intent="gravacao"
          fields={[
            {
              scope: 'body',
              field: 'valor_centavos',
              label: 'Nova unidade (R$)',
              id: inputId,
            },
          ]}
        />
      )}
      {state.uncertain && (
        <div role="status">
          <p>
            Não foi possível confirmar se a nova unidade foi salva. Consulte o
            resultado antes de tentar de novo.
          </p>
          <button
            type="button"
            disabled={escrita.busy || escrita.waiting}
            onClick={() => void escrita.consult()}
          >
            Consultar resultado
          </button>
        </div>
      )}
      {state.notRecorded && state.body && (
        <div role="status">
          <p>
            Nada foi gravado com esta tentativa. Você pode reenviar a mesma
            unidade de {moeda(state.body.valor_centavos)} ou descartá-la.
          </p>
          <button
            type="button"
            disabled={escrita.busy || escrita.waiting || !escrita.canWrite}
            onClick={() => void escrita.resend()}
          >
            Reenviar a mesma unidade
          </button>
          <button type="button" onClick={escrita.reset}>
            Descartar
          </button>
        </div>
      )}
      <dialog
        ref={dialog}
        aria-labelledby="unidade-confirmar"
        onClose={() => trigger.current?.focus()}
      >
        <h2 id="unidade-confirmar">Salvar nova unidade?</h2>
        {pedido !== undefined && unidade && (
          <p>
            A unidade passa de{' '}
            <strong className="numero">
              {moeda(unidade.vigente.valor_centavos)}
            </strong>{' '}
            para <strong className="numero">{moeda(pedido)}</strong> a partir de
            agora. Apostas já registradas continuam com a unidade com que foram
            criadas.
          </p>
        )}
        <button type="button" onClick={confirmar}>
          Salvar unidade
        </button>
        <button type="button" onClick={() => dialog.current?.close()}>
          Agora não
        </button>
      </dialog>
    </section>
  );
}

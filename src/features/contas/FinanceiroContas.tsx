import { moeda } from '../../lib/format';
import { metricas, type Financeiro } from './protocol';
function Valores({ values }: { values: Record<string, number | string> }) {
  return (
    <dl className="contas-valores">
      {metricas(values).map(({ label, value }) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd className="numero">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
export function FinanceiroContas({ data }: { data: Financeiro }) {
  return (
    <section aria-labelledby="contas-financeiro">
      <h2 id="contas-financeiro">Financeiro por titular e conta</h2>
      <p>
        Lucro e movimentos seguem o recorte informado. Saldos são atuais, sem
        corte por período. Apostas apagadas ou em revisão grave ficam fora deste
        financeiro.
      </p>
      <p>
        Saldo atual do recorte:{' '}
        <strong className="numero">{moeda(data.saldo_atual_centavos)}</strong>
      </p>
      <details className="contas-caixa">
        <summary>Total do recorte</summary>
        <Valores values={data.total} />
      </details>
      {data.titulares.map((holder) => (
        <details className="contas-caixa" key={holder.titular_id}>
          <summary>
            {holder.nome} · saldo {moeda(holder.saldo_atual_centavos)}
          </summary>
          <Valores values={holder.metricas} />
          {holder.contas.map((account) => (
            <article key={account.conta_casa_id}>
              <h3>
                {account.apelido} · {account.casa_nome}
              </h3>
              <p>
                Saldo atual:{' '}
                <span className="numero">
                  {moeda(account.saldo_atual_centavos)}
                </span>
              </p>
              <Valores values={account.metricas} />
            </article>
          ))}
        </details>
      ))}
      <details className="contas-caixa">
        <summary>Apostas e movimentos sem conta atribuída</summary>
        <Valores values={data.nao_atribuidas} />
        <p>
          São uma categoria separada fornecida pela API, sem distribuição
          automática entre titulares.
        </p>
      </details>
      <details className="contas-caixa">
        <summary>Contas sem titular · {data.contas_sem_titular.length}</summary>
        {data.contas_sem_titular.length ? (
          data.contas_sem_titular.map((account) => (
            <article key={account.conta_casa_id}>
              <h3>
                {account.apelido} · {account.casa_nome}
              </h3>
              <p>
                Saldo atual:{' '}
                <span className="numero">
                  {moeda(account.saldo_atual_centavos)}
                </span>
              </p>
              <Valores values={account.metricas} />
            </article>
          ))
        ) : (
          <p>
            Nenhuma conta sem titular neste recorte. Consulte outros filtros se
            necessário.
          </p>
        )}
      </details>
      {!data.titulares.length && (
        <p>
          Nenhum titular com dados neste recorte. Consulte outro titular ou
          período.
        </p>
      )}
    </section>
  );
}

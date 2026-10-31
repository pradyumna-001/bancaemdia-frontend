import { useState } from 'react';
import { EscolhaFiltro } from '../../../components/filtros/EscolhaFiltro';
import { DataFiltro } from '../../../components/filtros/DataFiltro';
import { dataCivil } from '../../../lib/format';
import {
  METRICAS,
  STATUS,
  metrica,
  percentual,
  editarValor,
  entradaValor,
  type Meta,
  type Entrada,
} from './protocol';

export function MetaForm({
  meta,
  disabled,
  submit,
}: {
  meta: Meta | null;
  disabled: boolean;
  submit: (body: Entrada, status: Meta['status']) => void;
}) {
  const [titulo, setTitulo] = useState(meta?.titulo ?? '');
  const [kind, setKind] = useState<Meta['metrica'] | undefined>(meta?.metrica);
  const [inicio, setInicio] = useState<string | undefined>(meta?.inicio);
  const [fim, setFim] = useState<string | undefined>(meta?.fim);
  const [alvo, setAlvo] = useState(
    meta ? editarValor(meta.alvo, meta.metrica) : '',
  );
  const [base, setBase] = useState(
    meta ? editarValor(meta.linha_base, meta.metrica) : '',
  );
  const [status, setStatus] = useState<Meta['status']>(meta?.status ?? 'ativa');
  const [error, setError] = useState('');
  const unit = !kind
    ? 'Escolha primeiro a métrica.'
    : percentual(kind)
      ? 'Em porcentagem; por exemplo, 12,5 representa 12,5%. Até quatro casas decimais.'
      : kind.endsWith('_centavos')
        ? 'Em reais, com sinal quando necessário. Use vírgula; até oito casas decimais.'
        : 'Quantidade no intervalo escolhido. Até seis casas decimais.';
  return (
    <form
      className="meta-form"
      onSubmit={(event) => {
        event.preventDefault();
        setError('');
        try {
          if (
            !titulo.trim() ||
            !kind ||
            !inicio ||
            !fim ||
            !alvo.trim() ||
            !base.trim()
          )
            throw new Error();
          dataCivil(inicio);
          dataCivil(fim);
          if (inicio > fim) {
            setError(
              'A data inicial deve vir antes ou no mesmo dia da data final.',
            );
            return;
          }
          submit(
            {
              titulo: titulo.trim(),
              metrica: kind,
              inicio,
              fim,
              alvo: entradaValor(alvo, kind),
              linha_base: entradaValor(base, kind),
            },
            status,
          );
        } catch {
          setError(
            'Confira os campos. Use valores decimais sem separador de milhar, dentro da precisão indicada.',
          );
        }
      }}
    >
      <fieldset disabled={disabled}>
        <legend>{meta ? 'Dados da meta' : 'Defina seu objetivo'}</legend>
        <label htmlFor="meta-titulo">
          Título
          <input
            id="meta-titulo"
            value={titulo}
            maxLength={120}
            required
            onChange={(e) => setTitulo(e.target.value)}
          />
        </label>
        <EscolhaFiltro
          id="meta-metrica"
          label="Métrica"
          value={kind}
          selectedLabel={!kind ? 'Escolher métrica' : undefined}
          resetLabel="Escolher métrica"
          options={Object.entries(METRICAS).map(([value, label]) => ({
            value,
            label,
          }))}
          onChange={(value) => {
            setKind(value && metrica(value) ? value : undefined);
            setAlvo('');
            setBase('');
          }}
        />
        <div className="meta-form-dupla">
          <DataFiltro
            label="Data inicial da meta"
            value={inicio}
            onChange={setInicio}
            emptyLabel="Escolher data"
            clearLabel="Limpar data"
            help="Primeiro dia do intervalo próprio desta meta. Os atalhos Hoje/Ontem usam São Paulo."
          />
          <DataFiltro
            label="Data final da meta"
            value={fim}
            onChange={setFim}
            emptyLabel="Escolher data"
            clearLabel="Limpar data"
            help="O último dia também é incluído. Estes campos não alteram o período do Painel."
          />
        </div>
        <p id="meta-unidade">{unit}</p>
        <div className="meta-form-dupla">
          <label htmlFor="meta-alvo">
            Alvo
            <input
              id="meta-alvo"
              value={alvo}
              required
              inputMode="decimal"
              disabled={!kind}
              aria-describedby="meta-unidade"
              onChange={(e) => setAlvo(e.target.value)}
            />
          </label>
          <label htmlFor="meta-base">
            Linha base
            <input
              id="meta-base"
              value={base}
              required
              inputMode="decimal"
              disabled={!kind}
              aria-describedby="meta-base-ajuda meta-unidade"
              onChange={(e) => setBase(e.target.value)}
            />
          </label>
        </div>
        <p id="meta-base-ajuda">
          Referência inicial usada no progresso. Informe-a explicitamente,
          inclusive quando for zero. Não é o saldo inicial da banca.
        </p>
        {meta &&
          (meta.status === 'arquivada' ? (
            <p>Status: Arquivada.</p>
          ) : (
            <EscolhaFiltro
              label="Status da meta"
              value={status}
              selectedLabel={STATUS[status]}
              resetLabel="Manter status"
              options={(['ativa', 'concluida'] as const).map((value) => ({
                value,
                label: STATUS[value],
              }))}
              onChange={(value) => {
                if (value === 'ativa' || value === 'concluida')
                  setStatus(value);
              }}
            />
          ))}
        {meta && (
          <p>
            O status é escolhido por você; atingir o alvo é uma indicação
            separada, conforme os resultados consultados.
          </p>
        )}
        <button className="meta-primaria">
          {meta ? 'Salvar alterações da meta' : 'Criar meta'}
        </button>
      </fieldset>
      {error && <p role="alert">{error}</p>}
    </form>
  );
}

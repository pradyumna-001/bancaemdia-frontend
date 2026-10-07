import { useSearchParams } from 'react-router-dom';
import {
  DIMENSOES,
  PERIODOS,
  adaptarFiltros,
  alterarFiltro,
  lerFiltros,
  type Dimensao,
  type Filtro,
  type RecursoFiltros,
} from '../../lib/params';
import { ESTADOS_APOSTA } from '../../lib/termos';
import { EscolhaFiltro, type OpcaoFiltro } from './EscolhaFiltro';
import { DataFiltro } from './DataFiltro';
import './filtros.css';
export type CatalogoFiltro = Readonly<{
  fase: 'pronto' | 'carregando' | 'erro';
  options: readonly OpcaoFiltro[];
  tentar?: () => void;
}>;
export type CatalogosFiltros = Readonly<
  Partial<Record<Dimensao | 'origem', CatalogoFiltro>>
>;
const entries = (labels: Readonly<Record<string, string>>) =>
  Object.entries(labels).map(([value, label]) => ({ value, label }));
export function useFiltros(recurso: RecursoFiltros) {
  const [search, setSearch] = useSearchParams();
  const visao = lerFiltros(search);
  return {
    visao,
    adapter: adaptarFiltros(visao, recurso),
    alterar: (key: Filtro, value?: string) =>
      setSearch((current) => alterarFiltro(current, key, value)),
  };
}
export function Filtros({
  recurso,
  catalogos = {},
}: {
  recurso: RecursoFiltros;
  catalogos?: CatalogosFiltros;
}) {
  const { visao, adapter, alterar } = useFiltros(recurso);
  const list = recurso === 'apostas';
  const dimensoes: Dimensao[] = list
    ? ['casa', 'tipster', 'mercado', 'competicao']
    : ['casa', 'tipster', 'mercado'];
  const pillLabels: Readonly<Record<string, string>> = {
    ...DIMENSOES,
    estado: 'Estado',
    origem: 'Origem',
    desde: 'De',
    ate: 'Até',
    periodo: 'Período',
    apagadas: 'Visibilidade',
    revisao: 'Revisão grave',
  };
  const name = (key: Filtro, value: string) => {
    if (Object.hasOwn(DIMENSOES, key))
      return (
        catalogos[key as Dimensao]?.options.find(
          (option) => option.value === value,
        )?.label ?? 'Identificador ' + value + ' (nome indisponível)'
      );
    if (key === 'estado')
      return ESTADOS_APOSTA[value as keyof typeof ESTADOS_APOSTA];
    if (key === 'periodo') return PERIODOS[value as keyof typeof PERIODOS];
    if (key === 'apagadas')
      return value === '1'
        ? 'Somente apagadas'
        : value === 'todas'
          ? 'Ativas e apagadas'
          : 'Ativas';
    if (key === 'revisao')
      return value === '1' ? 'Com revisão grave' : 'Sem revisão grave';
    return value;
  };
  return (
    <section className="filtros" aria-label="Filtros da visão">
      <h2>Filtros</h2>
      <p>{adapter.escopo}</p>
      {!!visao.invalidos.length && (
        <p role="status">
          Filtros inválidos no endereço usam o padrão:{' '}
          {visao.invalidos
            .map(
              (key) =>
                pillLabels[key] ??
                (key === 'page' ? 'Página' : 'Itens por página'),
            )
            .join(', ')}
          . Ao alterar a visão, o endereço será corrigido.
        </p>
      )}
      <div className="filtro-controles">
        {dimensoes.map((key) => {
          const catalogo = catalogos[key];
          return (
            <div key={key}>
              <EscolhaFiltro
                label={DIMENSOES[key]}
                value={visao.valores[key]}
                options={catalogo?.fase === 'pronto' ? catalogo.options : []}
                disabled={catalogo?.fase !== 'pronto'}
                onChange={(value) => alterar(key, value)}
              />
              {(!catalogo || catalogo.fase !== 'pronto') && (
                <p className="legenda">
                  {!catalogo
                    ? 'Este filtro ainda não está disponível.'
                    : catalogo.fase === 'carregando'
                      ? 'Carregando opções…'
                      : 'Não foi possível carregar as opções.'}
                </p>
              )}
              {catalogo?.fase === 'pronto' && !catalogo.options.length && (
                <p className="legenda">
                  Nenhuma opção disponível para sua conta.
                </p>
              )}
              {catalogo?.fase === 'erro' && catalogo.tentar && (
                <button type="button" onClick={catalogo.tentar}>
                  Tentar carregar {DIMENSOES[key].toLowerCase()}
                </button>
              )}
            </div>
          );
        })}
        {list ? (
          <>
            <EscolhaFiltro
              label="Estado"
              value={visao.valores.estado}
              options={entries(ESTADOS_APOSTA)}
              onChange={(value) => alterar('estado', value)}
            />
            <div>
              <EscolhaFiltro
                label="Origem"
                value={visao.valores.origem}
                options={
                  catalogos.origem?.fase === 'pronto'
                    ? catalogos.origem.options
                    : []
                }
                disabled={catalogos.origem?.fase !== 'pronto'}
                onChange={(value) => alterar('origem', value)}
              />
              {catalogos.origem?.fase !== 'pronto' && (
                <p className="legenda">
                  {!catalogos.origem
                    ? 'O filtro de origem ainda não está disponível.'
                    : catalogos.origem.fase === 'carregando'
                      ? 'Carregando origens…'
                      : 'Não foi possível carregar as origens.'}
                </p>
              )}
              {catalogos.origem?.fase === 'erro' && catalogos.origem.tentar && (
                <button type="button" onClick={catalogos.origem.tentar}>
                  Tentar carregar origem
                </button>
              )}
              {catalogos.origem?.fase === 'pronto' &&
                !catalogos.origem.options.length && (
                  <p className="legenda">
                    Nenhuma origem disponível para sua conta.
                  </p>
                )}
            </div>
            <EscolhaFiltro
              label="Visibilidade"
              resetLabel="Usar padrão: ativas"
              value={visao.valores.apagadas ?? '0'}
              options={[
                { value: '0', label: 'Ativas' },
                { value: 'todas', label: 'Ativas e apagadas' },
              ]}
              onChange={(value) => alterar('apagadas', value)}
            />
            <EscolhaFiltro
              label="Revisão grave"
              value={visao.valores.revisao}
              options={[
                { value: '1', label: 'Com revisão grave' },
                { value: '0', label: 'Sem revisão grave' },
              ]}
              onChange={(value) => alterar('revisao', value)}
            />
            <DataFiltro
              label="De"
              value={visao.valores.desde}
              onChange={(value) => alterar('desde', value)}
            />
            <DataFiltro
              label="Até"
              value={visao.valores.ate}
              onChange={(value) => alterar('ate', value)}
            />
          </>
        ) : (
          <EscolhaFiltro
            label="Período"
            resetLabel="Usar padrão: últimos 30 dias"
            value={visao.valores.periodo ?? '30d'}
            options={entries(PERIODOS)}
            onChange={(value) => alterar('periodo', value)}
          />
        )}
      </div>
      <ul className="filtro-pilulas" aria-label="Filtros salvos na URL">
        {(Object.entries(visao.valores) as [Filtro, string][]).map(
          ([key, value]) => (
            <li key={key}>
              <button
                type="button"
                aria-label={'Remover filtro ' + pillLabels[key]}
                onClick={() => alterar(key)}
              >
                {pillLabels[key]}: {name(key, value)}
                {adapter.preservados.includes(key)
                  ? ' — preservado, não aplicado nesta área'
                  : ''}
                <span aria-hidden="true"> ×</span>
              </button>
            </li>
          ),
        )}
      </ul>
      {!!adapter.preservados.length && (
        <p role="status">
          O contexto foi preservado. Esta área não aplica:{' '}
          {adapter.preservados.map((key) => pillLabels[key]).join(', ')}.
        </p>
      )}
      {adapter.bloqueios.map((message) => (
        <p key={message} role="alert">
          {message}
        </p>
      ))}
    </section>
  );
}

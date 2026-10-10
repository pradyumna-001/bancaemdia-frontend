import { useSearchParams } from 'react-router-dom';
import type { ContratoLeitura } from '../../api/readContract';
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
  selecionada?: OpcaoFiltro;
  erro?: string;
  selecionadaErro?: string;
  tentarSelecionada?: () => void;
  consulta?: string;
  buscar?: (q: string) => void;
  pagina?: number;
  anterior?: () => void;
  proxima?: () => void;
  atualizando?: boolean;
}>;
export type CatalogosFiltros = Readonly<
  Partial<Record<Dimensao | 'origem', CatalogoFiltro>>
>;
const entries = (labels: Readonly<Record<string, string>>) =>
  Object.entries(labels).map(([value, label]) => ({ value, label }));
export function useFiltros(
  recurso: RecursoFiltros,
  contrato?: ContratoLeitura,
) {
  const [search, setSearch] = useSearchParams();
  const visao = lerFiltros(search);
  return {
    visao,
    adapter: adaptarFiltros(visao, recurso, contrato),
    alterar: (key: Filtro, value?: string) =>
      setSearch((current) => alterarFiltro(current, key, value)),
  };
}
export function Filtros({
  recurso,
  catalogos = {},
  contrato,
}: {
  recurso: RecursoFiltros;
  catalogos?: CatalogosFiltros;
  contrato?: ContratoLeitura;
}) {
  const { visao, adapter, alterar } = useFiltros(recurso, contrato);
  const dimensoes = [...Object.keys(DIMENSOES), 'origem'] as (
    Dimensao | 'origem'
  )[];
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
    if (Object.hasOwn(DIMENSOES, key) || key === 'origem')
      return (
        catalogos[key as Dimensao | 'origem']?.selecionada?.label ??
        catalogos[key as Dimensao | 'origem']?.options.find(
          (option) => option.value === value,
        )?.label ??
        'Identificador ' + value + ' (nome indisponível)'
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
          const label = key === 'origem' ? 'Origem' : DIMENSOES[key];
          return (
            <div key={key}>
              <EscolhaFiltro
                label={label}
                value={visao.valores[key]}
                options={catalogo?.fase === 'pronto' ? catalogo.options : []}
                disabled={!catalogo}
                selectedLabel={catalogo?.selecionada?.label}
                busca={
                  catalogo?.buscar
                    ? {
                        consulta: catalogo.consulta ?? '',
                        buscar: catalogo.buscar,
                        atualizando: catalogo.atualizando,
                      }
                    : undefined
                }
                onChange={(value) => alterar(key, value)}
              >
                {catalogo?.fase === 'carregando' && (
                  <p role="status">Carregando opções…</p>
                )}
                {catalogo?.fase === 'erro' && (
                  <p role="alert">
                    {catalogo.erro ?? 'Não foi possível carregar as opções.'}
                  </p>
                )}
                {catalogo?.fase === 'pronto' && !catalogo.options.length && (
                  <p>Nenhuma opção corresponde à busca.</p>
                )}
                {catalogo?.fase === 'erro' && catalogo.tentar && (
                  <button type="button" onClick={catalogo.tentar}>
                    Tentar carregar {label.toLowerCase()}
                  </button>
                )}
                {catalogo?.pagina && (
                  <div className="filtro-mes">
                    <button
                      type="button"
                      disabled={!catalogo.anterior}
                      onClick={catalogo.anterior}
                    >
                      Opções anteriores
                    </button>
                    <span role="status">Página {catalogo.pagina}</span>
                    <button
                      type="button"
                      disabled={!catalogo.proxima}
                      onClick={catalogo.proxima}
                    >
                      Próximas opções
                    </button>
                  </div>
                )}
              </EscolhaFiltro>
              {(!catalogo || catalogo.fase !== 'pronto') && (
                <p className="legenda">
                  {!catalogo
                    ? 'Este filtro ainda não está disponível.'
                    : catalogo.fase === 'carregando'
                      ? 'Carregando opções…'
                      : (catalogo.erro ??
                        'Não foi possível carregar as opções.')}
                </p>
              )}
              {catalogo?.fase === 'pronto' && !catalogo.options.length && (
                <p className="legenda">
                  {catalogo.consulta
                    ? 'Nenhuma opção corresponde à busca.'
                    : 'Nenhuma opção disponível para sua conta.'}
                </p>
              )}
              {catalogo?.fase === 'erro' && catalogo.tentar && (
                <button type="button" onClick={catalogo.tentar}>
                  Tentar carregar {label.toLowerCase()}
                </button>
              )}
              {catalogo?.selecionadaErro && (
                <p role="status">{catalogo.selecionadaErro}</p>
              )}
              {catalogo?.tentarSelecionada && (
                <button type="button" onClick={catalogo.tentarSelecionada}>
                  Consultar nome de {label.toLowerCase()}
                </button>
              )}
            </div>
          );
        })}
        <>
          <EscolhaFiltro
            label="Estado"
            value={visao.valores.estado}
            options={entries(ESTADOS_APOSTA)}
            onChange={(value) => alterar('estado', value)}
          />
          <EscolhaFiltro
            label="Visibilidade"
            resetLabel="Usar padrão: ativas"
            value={visao.valores.apagadas ?? '0'}
            options={[
              { value: '0', label: 'Ativas' },
              { value: '1', label: 'Somente apagadas' },
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
          <EscolhaFiltro
            label="Período"
            resetLabel="Sem período definido"
            value={visao.valores.periodo}
            options={entries(PERIODOS)}
            onChange={(value) => alterar('periodo', value)}
          />
        </>
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

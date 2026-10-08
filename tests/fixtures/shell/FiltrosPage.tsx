// Exercise reusable controls only; this catalog and route never enter the public build.
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { Filtros, useFiltros } from '../../../src/components/filtros/Filtros';
import { trocarPagina } from '../../../src/lib/params';
import { PreferenciaTema } from '../../../src/components/PreferenciaTema';
import '../../../src/app/pages.css';
const catalogos = {
  casa: {
    fase: 'pronto' as const,
    options: [{ value: '2', label: 'Casa de teste' }],
  },
  tipster: { fase: 'pronto' as const, options: [] },
  mercado: { fase: 'erro' as const, options: [] },
};
export function FiltrosPage() {
  const location = useLocation();
  const [, setSearch] = useSearchParams();
  const resource = location.pathname.endsWith('/painel') ? 'painel' : 'apostas';
  const { visao, adapter } = useFiltros(resource);
  return (
    <main className="pagina">
      <h1>Exercício de filtros</h1>
      <p>
        Componentes reutilizáveis da #17. Nenhuma lista ou valor financeiro é
        simulado aqui.
      </p>
      <PreferenciaTema />
      <Filtros recurso={resource} catalogos={catalogos} />
      <div className="acoes">
        <Link
          to={{
            pathname:
              resource === 'apostas'
                ? '/testes/filtros/painel'
                : '/testes/filtros',
            search: location.search,
          }}
        >
          Outra área
        </Link>
        <button
          type="button"
          onClick={() =>
            setSearch((current) => trocarPagina(current, visao.page + 1))
          }
        >
          Próxima página
        </button>
      </div>
      <output aria-label="Consulta normalizada">
        {JSON.stringify(adapter.apostas ?? adapter.painel ?? null)}
      </output>
    </main>
  );
}

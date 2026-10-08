import { useAuth } from '../../auth/ProvedorAuth';
import type { RecursoFiltros } from '../../lib/params';
import { Filtros, useFiltros } from './Filtros';
import { useCatalogosFiltros } from './useCatalogosFiltros';

function CatalogosDaSessao({ recurso }: { recurso: RecursoFiltros }) {
  const { visao } = useFiltros(recurso);
  const catalogos = useCatalogosFiltros(visao);
  return <Filtros recurso={recurso} catalogos={catalogos} />;
}
export function FiltrosDaApi({ recurso }: { recurso: RecursoFiltros }) {
  const auth = useAuth();
  if (!auth?.state.person || auth.state.logoutUnconfirmed) return null;
  return (
    <CatalogosDaSessao
      key={`${auth.state.person.id}:${auth.state.privateEpoch}`}
      recurso={recurso}
    />
  );
}

import { Link, useLocation, useParams } from 'react-router-dom';
import { FotoAposta } from '../../components/FotoAposta';
import type { createApiClient } from '../../api/client';

export function FotoPage({
  client,
}: {
  client?: ReturnType<typeof createApiClient>;
}) {
  const { chave = '' } = useParams();
  const location = useLocation();
  return (
    <main className="pagina">
      <Link to={'/aposta/' + encodeURIComponent(chave) + location.search}>
        Voltar para a aposta
      </Link>
      <h1>Foto da aposta</h1>
      <p>
        Confira a evidência original desta aposta. Os dados e o histórico ficam
        no detalhe.
      </p>
      <FotoAposta
        chave={chave}
        client={client}
        destination={location.pathname + location.search}
      />
      <Link to={'/' + location.search}>Voltar para Apostas</Link>
    </main>
  );
}

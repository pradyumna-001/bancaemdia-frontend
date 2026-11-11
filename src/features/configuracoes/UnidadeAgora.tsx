import { useQuery } from '@tanstack/react-query';
import { Link, useLocation } from 'react-router-dom';
import type { createApiClient } from '../../api/client';
import { useAuth } from '../../auth/ProvedorAuth';
import { moeda } from '../../lib/format';
import { UNIDADE, conferirUnidade } from './unidade';

// Informational: the service applies the unit in force at the bet's instant,
// so a past bet may use another value from the history.
export function UnidadeAgora({
  client,
}: {
  client: ReturnType<typeof createApiClient>;
}) {
  const auth = useAuth();
  const location = useLocation();
  const query = useQuery({
    queryKey: ['unidade', auth?.state.privateEpoch, auth?.state.person?.id],
    enabled: auth?.state.phase === 'authenticated',
    queryFn: ({ signal }) =>
      auth!.service.read(async () =>
        conferirUnidade((await client.GET(UNIDADE, { signal })).data),
      ),
    retryOnMount: false,
  });
  const configuracoes = (
    <Link to={'/configuracoes' + location.search}>Configurações</Link>
  );
  if (query.isPending) return null;
  if (!query.data)
    return (
      <p className="nova-ajuda">
        Não foi possível consultar a unidade agora; o serviço aplica a unidade
        vigente no instante da aposta. Veja em {configuracoes}.
      </p>
    );
  return (
    <p className="nova-ajuda">
      Unidade agora:{' '}
      <strong className="numero">
        {moeda(query.data.vigente.valor_centavos)}
      </strong>
      . Para apostas de outras datas, o serviço aplica a unidade vigente no
      instante da aposta (histórico em {configuracoes}).
    </p>
  );
}

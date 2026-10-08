import { Link, useLocation } from 'react-router-dom';
import { useAcesso } from './ProvedorAcesso';
import { dataHora } from '../../lib/format';
import { recuperacaoErro } from '../../api/recovery';
import './acesso.css';

export function AvisoAcesso() {
  const access = useAcesso();
  const location = useLocation();
  if (!access || access.phase === 'write') return null;
  const unknown = access.phase === 'unknown';
  const checking = access.phase === 'checking';
  const retry =
    !unknown || recuperacaoErro(access.error, 'leitura').action === 'tentar';
  const ends =
    access.status?.current_period_ends_at ?? access.status?.trial_ends_at;
  return (
    <section className="aviso-acesso" aria-label="Acesso à conta">
      <div>
        <h2>
          {checking
            ? 'Conferindo acesso à conta…'
            : unknown
              ? 'Não foi possível conferir seu acesso'
              : 'Sua conta está em modo de leitura'}
        </h2>
        <p role={unknown ? 'alert' : 'status'}>
          {checking
            ? 'Você pode continuar consultando seus dados enquanto conferimos as ações disponíveis.'
            : unknown
              ? 'A consulta e a exportação continuam disponíveis. As ações de escrita aguardam uma nova confirmação do serviço.'
              : 'Você pode consultar e exportar seus dados. Para voltar a enviar ou alterar dados, confira sua assinatura.'}
        </p>
        {unknown && access.error && (
          <p>{recuperacaoErro(access.error, 'leitura').description}</p>
        )}
        {ends && (
          <p>
            Fim do período informado pelo serviço:{' '}
            <time dateTime={ends}>{dataHora(ends, 'America/Sao_Paulo')}</time>.
          </p>
        )}
        {access.waiting && (
          <p>
            Aguarde o prazo informado pelo serviço antes de conferir novamente.
          </p>
        )}
      </div>
      <div className="acesso-acoes">
        {!checking && retry && (
          <button
            type="button"
            disabled={access.checking || access.waiting}
            onClick={access.refresh}
          >
            {access.checking ? 'Conferindo acesso…' : 'Conferir acesso'}
          </button>
        )}
        {!checking && (
          <Link to={{ pathname: '/assinatura', search: location.search }}>
            Ver assinatura
          </Link>
        )}
      </div>
    </section>
  );
}

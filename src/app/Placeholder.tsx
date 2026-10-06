import { Link } from 'react-router-dom';
import { PreferenciaTema } from '../components/PreferenciaTema';
import { Logo } from '../components/Logo';
import { SessionActions } from '../auth/SessionActions';

export function Placeholder({
  title,
  interna = false,
}: {
  title: string;
  interna?: boolean;
}) {
  return (
    <main className={interna ? 'pagina pagina-interna' : 'pagina'}>
      {!interna && (
        <header className="cabecalho-marca">
          <Logo />
        </header>
      )}
      <h1>{title}</h1>
      <p>Esta página está em preparação.</p>
      <p>Você poderá usar este recurso em uma próxima etapa.</p>
      <SessionActions />
      <div className="acoes">
        <Link to="/tutorial">Abrir tutorial</Link>
        {!interna && <Link to="/login">Ir para entrar</Link>}
      </div>
      {!interna && <PreferenciaTema />}
    </main>
  );
}

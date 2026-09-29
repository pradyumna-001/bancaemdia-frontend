import { Link } from 'react-router-dom';
import { PreferenciaTema } from '../components/PreferenciaTema';

export function Placeholder({ title }: { title: string }) {
  return (
    <main className="pagina">
      <p className="assinatura">bancaemdia</p>
      <h1>{title}</h1>
      <p>Esta página está em preparação.</p>
      <p>Você poderá usar este recurso em uma próxima etapa.</p>
      <div className="acoes">
        <Link to="/tutorial">Abrir tutorial</Link>
        <Link to="/login">Ir para entrar</Link>
      </div>
      <PreferenciaTema />
    </main>
  );
}

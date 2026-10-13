import { Link, useLocation } from 'react-router-dom';
import { PreferenciaTema } from '../../components/PreferenciaTema';
import { FusoPreferencia } from './FusoPreferencia';
import type { createApiClient } from '../../api/client';
import './configuracoes.css';

export function ConfiguracoesPage({
  client,
}: {
  client?: ReturnType<typeof createApiClient>;
}) {
  const location = useLocation();
  const retornoContaParams = new URLSearchParams(location.search);
  retornoContaParams.set('destino', location.pathname + location.search);
  return (
    <main className="pagina configuracoes">
      <header>
        <h1>Configurações</h1>
        <p>
          Ajuste a aparência e os dias das análises. Acesse também as conexões e
          os cuidados com sua conta.
        </p>
      </header>
      <div className="configuracoes-grid">
        <section
          className="configuracoes-card"
          aria-labelledby="aparencia-titulo"
        >
          <h2 id="aparencia-titulo">Aparência do site</h2>
          <p>
            Sistema acompanha o tema do seu dispositivo. Você também pode
            escolher Claro ou Escuro.
          </p>
          <PreferenciaTema />
        </section>
        <FusoPreferencia client={client} />
        <section className="configuracoes-card" aria-labelledby="conta-titulo">
          <h2 id="conta-titulo">Sua conta</h2>
          <ul className="configuracoes-links">
            <li>
              <Link to={'/configuracoes/conexoes' + location.search}>
                Conexões
              </Link>
              <p>Conecte ou desconecte seu Telegram.</p>
            </li>
            <li>
              <Link to={'/assinatura' + location.search}>Assinatura</Link>
              <p>Consulte o acesso da conta e gerencie a assinatura.</p>
            </li>
            <li>
              <Link to={'/senha?' + retornoContaParams.toString()}>
                Alterar senha
              </Link>
              <p>Continue no serviço que protege seu acesso.</p>
            </li>
            <li>
              <Link to={'/configuracoes/privacidade' + location.search}>
                Privacidade
              </Link>
              <p>Exportação e encerramento da conta estão em preparação.</p>
            </li>
          </ul>
        </section>
      </div>
    </main>
  );
}

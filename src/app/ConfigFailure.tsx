import { ConfigError } from '../lib/config';
import { PreferenciaTema } from '../components/PreferenciaTema';
import { Logo } from '../components/Logo';

export function ConfigFailure({ error }: { error: unknown }) {
  return (
    <main className="pagina pagina-erro">
      <header className="cabecalho-marca">
        <Logo />
      </header>
      <h1>Não foi possível iniciar o bancaemdia</h1>
      <p role="alert">
        {error instanceof ConfigError
          ? error.message
          : 'A configuração do site está indisponível.'}
      </p>
      <p>Se o problema continuar, avise o responsável pelo site.</p>
      <button type="button" onClick={() => window.location.reload()}>
        Tentar novamente
      </button>
      <PreferenciaTema />
    </main>
  );
}

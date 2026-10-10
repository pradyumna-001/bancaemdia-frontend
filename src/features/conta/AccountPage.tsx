import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../auth/ProvedorAuth';
import { destinoInterno } from '../../auth/destinoInterno';
import { Logo } from '../../components/Logo';
import { ErroApi } from '../../components/ErroApi';
import { useRetryAfter } from '../../lib/useRetryAfter';
import './conta.css';

const journeys = {
  '/login': {
    title: 'Entrar',
    description: 'Acesse suas apostas e continue de onde parou.',
    action: 'Entrar com minha conta',
    intent: 'login',
  },
  '/criar-conta': {
    title: 'Criar conta',
    description: 'Crie sua conta para começar a organizar suas apostas.',
    action: 'Continuar para criar conta',
    intent: 'signup',
  },
  '/esqueci-senha': {
    title: 'Esqueci minha senha',
    description: 'Recupere o acesso à sua conta pelo seu e-mail.',
    action: 'Continuar para recuperar senha',
    intent: 'recover',
  },
  '/redefinir-senha': {
    title: 'Redefinir senha',
    description:
      'Abra o link mais recente do e-mail de recuperação no navegador em que fez o pedido.',
    action: 'Recomeçar recuperação',
    intent: 'recover',
  },
  '/confirmar-email': {
    title: 'Confirmar e-mail',
    description:
      'Abra o link mais recente do e-mail de confirmação no navegador em que iniciou o cadastro.',
    action: 'Continuar confirmação',
    intent: 'login',
  },
  '/senha': {
    title: 'Alterar senha',
    description: 'Use a recuperação por e-mail para definir uma nova senha.',
    action: 'Continuar para alterar senha',
    intent: 'recover',
  },
} as const;
type JourneyPath = keyof typeof journeys;

export function AccountPage({ path }: { path: JourneyPath | '/sair' }) {
  const auth = useAuth();
  const location = useLocation();
  const service = auth?.service;
  const phase = auth?.state.phase;
  const waiting = useRetryAfter(auth?.state.error);
  const internal = path === '/senha' || path === '/sair';
  const destination = destinoInterno(
    new URLSearchParams(location.search).get('destino'),
  );
  const link = (target: string) =>
    `${target}?${new URLSearchParams({ destino: destination })}`;
  useEffect(() => {
    if (!internal && phase === 'checking') void service?.resume();
  }, [service, phase, internal]);
  const blocked =
    !auth ||
    phase === 'checking' ||
    phase === 'ending' ||
    !!auth.state.logoutUnconfirmed ||
    waiting ||
    (!!auth.state.error && auth.state.error.kind !== 'invalid_request');
  const journey = path === '/sair' ? undefined : journeys[path];
  const recovery = journey?.intent === 'recover';
  return (
    <main className={internal ? 'pagina pagina-interna conta' : 'conta-acesso'}>
      <section
        className={`conta-painel${internal ? ' conta-painel--interno' : ''}`}
        aria-labelledby="titulo-conta"
      >
        {!internal && (
          <header className="cabecalho-marca">
            <Logo />
          </header>
        )}
        {internal && <p className="legenda">Sua conta</p>}
        <h1 id="titulo-conta">{journey?.title ?? 'Sair'}</h1>
        <p className="conta-introducao">
          {journey?.description ?? 'Deseja sair da sua conta neste navegador?'}
        </p>
        {path === '/sair' ? (
          <>
            <p>
              Os dados privados desta sessão serão removidos deste navegador. A
              saída não apaga suas apostas.
            </p>
            <div className="acoes conta-acoes">
              <button
                type="button"
                disabled={!auth || phase !== 'authenticated'}
                onClick={() => {
                  void service?.logout();
                }}
              >
                Confirmar saída
              </button>
              <Link to={destination}>Continuar na conta</Link>
            </div>
          </>
        ) : (
          <>
            {phase === 'checking' && (
              <p className="conta-status" role="status">
                Conferindo acesso…
              </p>
            )}
            {auth?.state.error && !auth.state.logoutUnconfirmed && (
              <ErroApi
                error={auth.state.error}
                intent="leitura"
                destination={destination}
                actions={{
                  tentar: () => {
                    void service?.resume();
                  },
                }}
              />
            )}
            {auth?.state.logoutUnconfirmed && (
              <div className="conta-proximo">
                <h2>A saída ainda não foi confirmada</h2>
                <p>Confira a saída antes de iniciar outra entrada.</p>
                <div className="acoes">
                  <button
                    type="button"
                    disabled={waiting}
                    onClick={() => {
                      void service?.logout();
                    }}
                  >
                    Conferir saída
                  </button>
                </div>
              </div>
            )}
            <div className="acoes conta-acoes">
              <button
                type="button"
                disabled={blocked}
                onClick={() => service?.login(destination, journey!.intent)}
              >
                {journey!.action}
              </button>
            </div>
            <p className="conta-protecao">
              Você continuará para o acesso seguro da sua conta.
            </p>
            <nav className="conta-links" aria-label="Opções de acesso">
              {path !== '/login' && (
                <Link to={link('/login')}>Voltar para entrar</Link>
              )}
              {path === '/login' && (
                <>
                  <Link to={link('/criar-conta')}>Criar conta</Link>
                  <Link to={link('/esqueci-senha')}>Esqueci minha senha</Link>
                </>
              )}
              {path === '/confirmar-email' && (
                <Link to={link('/criar-conta')}>Recomeçar cadastro</Link>
              )}
              {auth?.state.phase === 'authenticated' && !internal && (
                <Link to={destination}>Continuar na conta</Link>
              )}
            </nav>
            <details key={path} className="conta-ajuda">
              <summary>Não conseguiu continuar?</summary>
              <p>
                Seu e-mail e sua senha são preenchidos na página segura de
                acesso.
              </p>
              {path === '/criar-conta' && (
                <p>
                  Criar uma conta não ativa uma assinatura. Confirme seu e-mail
                  para concluir o cadastro.
                </p>
              )}
              {path === '/confirmar-email' && (
                <p>
                  Se já confirmou o e-mail, entre com sua conta. Se precisar de
                  outro link, use a opção de reenvio na página de acesso.
                </p>
              )}
              {recovery && (
                <p>
                  Se houver uma conta para o e-mail informado, siga as
                  instruções recebidas. Ao concluir a recuperação iniciada por
                  este caminho, as sessões anteriores da sua conta serão
                  encerradas.
                </p>
              )}
              <p>
                Se o link expirou ou já foi utilizado, recomece o pedido e use o
                e-mail mais recente. Confira também a pasta de spam.
              </p>
              <p>
                Aguarde o prazo exibido pelo serviço antes de reenviar. Evite
                iniciar vários pedidos ao mesmo tempo.
              </p>
              {recovery && (
                <p>
                  Se interrompeu a recuperação, volte por esta página. Uma
                  recuperação iniciada diretamente no serviço de acesso não
                  encerra automaticamente suas sessões aqui.
                </p>
              )}
              <p>
                Se o serviço não abriu, volte a esta página e tente novamente
                quando estiver disponível.
              </p>
              <Link to="/tutorial">Abrir tutorial</Link>
            </details>
          </>
        )}
        {!internal && (
          <footer className="conta-rodape">
            <Link to="/tutorial">Abrir tutorial</Link>
          </footer>
        )}
      </section>
    </main>
  );
}

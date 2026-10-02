import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, useLocation, useRevalidator } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Logo } from '../components/Logo';
import { Icone } from '../components/Icone';
import { PreferenciaTema } from '../components/PreferenciaTema';
import {
  CHAVE_REVISAO,
  revisaoSimuladaVazia,
  validarTotalRevisao,
  mensagemFalhaRevisao,
  type ConsultarRevisao,
} from '../features/revisao/estatisticas';
import { ABAS, abaAtual } from './nav';
import './Shell.css';

export function Shell({
  children,
  consultarRevisao = revisaoSimuladaVazia,
}: {
  children: ReactNode;
  consultarRevisao?: ConsultarRevisao;
}) {
  const location = useLocation();
  const revalidation = useRevalidator();
  const recoveringError = useRef(false);
  const [menuEm, setMenuEm] = useState<string | null>(null);
  const menu = menuEm === location.key;
  const setMenu = (abrir: boolean) => setMenuEm(abrir ? location.key : null);
  const dialog = useRef<HTMLDialogElement>(null);
  const conteudo = useRef<HTMLDivElement>(null);
  const ultimoPath = useRef(location.pathname);
  const fila = useQuery({
    queryKey: CHAVE_REVISAO,
    queryFn: async ({ signal }) => {
      const dados = await consultarRevisao(signal);
      validarTotalRevisao(dados);
      return dados;
    },
  });
  const total = fila.data?.total ?? 0;
  const abas = ABAS.filter((aba) => aba.path !== '/revisao' || total > 0);
  const secundarias = abas.filter((aba) => !aba.mobile);
  useEffect(() => {
    if (menu) dialog.current?.showModal();
    else if (dialog.current?.open) dialog.current.close();
  }, [menu]);
  useEffect(() => {
    if (ultimoPath.current !== location.pathname) {
      ultimoPath.current = location.pathname;
      conteudo.current?.focus();
    }
  }, [location.pathname]);
  useEffect(() => {
    if (revalidation.state === 'loading') {
      recoveringError.current =
        !!conteudo.current?.querySelector('.pagina-erro');
    } else if (recoveringError.current) {
      recoveringError.current = false;
      const active = document.activeElement;
      if (
        !conteudo.current?.querySelector('.pagina-erro') &&
        !dialog.current?.open &&
        (active === document.body ||
          (active && conteudo.current?.contains(active)))
      )
        conteudo.current?.focus({ preventScroll: true });
    }
  }, [revalidation.state]);
  function link(aba: (typeof ABAS)[number]) {
    const atual = abaAtual(aba.path, location.pathname);
    return (
      <Link
        key={aba.path}
        to={{ pathname: aba.path, search: location.search }}
        aria-current={atual ? 'page' : undefined}
        onClick={() => setMenu(false)}
      >
        <Icone nome={aba.icone} />
        <span>{aba.title}</span>
        {aba.path === '/revisao' && (
          <>
            <span className="contador numero" aria-hidden="true">
              {total > 99 ? '99+' : total}
            </span>
            <span className="somente-leitor">, {total} pendências</span>
          </>
        )}
      </Link>
    );
  }
  return (
    <div className="shell">
      <a
        className="pular-conteudo"
        href="#conteudo"
        onClick={(event) => {
          event.preventDefault();
          conteudo.current?.focus();
        }}
      >
        Pular para o conteúdo
      </a>
      <header className="shell-topo">
        <div className="shell-identidade">
          <Link
            to={{ pathname: '/', search: location.search }}
            aria-label="bancaemdia — Apostas"
          >
            <Logo />
          </Link>
          <button
            type="button"
            className="abrir-preferencias"
            onClick={(event) => {
              // WebKit não foca botões ao clicar; o dialog precisa deste alvo para devolver o foco.
              event.currentTarget.focus({ preventScroll: true });
              setMenu(true);
            }}
            aria-haspopup="dialog"
          >
            <Icone nome="configuracoes" />
            <span>Opções</span>
          </button>
        </div>
        <nav className="nav-desktop" aria-label="Navegação principal">
          <div>{abas.filter((aba) => aba.desktop).map(link)}</div>
        </nav>
      </header>
      <div
        className="shell-conteudo"
        id="conteudo"
        ref={conteudo}
        tabIndex={-1}
      >
        {fila.isPending && (
          <p className="aviso-fila" role="status">
            Consultando fila de revisão…
          </p>
        )}
        {fila.isError && (
          <div className="aviso-fila" role="alert">
            <p>
              {mensagemFalhaRevisao(fila.error)}
              {fila.data ? ' A contagem anterior foi mantida.' : ''}
            </p>
            <button
              type="button"
              disabled={fila.isFetching}
              onClick={() => void fila.refetch()}
            >
              {fila.isFetching ? 'Consultando…' : 'Tentar novamente'}
            </button>
          </div>
        )}
        {children}
      </div>
      <nav className="nav-mobile" aria-label="Navegação principal no celular">
        {abas.filter((aba) => aba.mobile).map(link)}
        <button
          type="button"
          className={
            secundarias.some((aba) => abaAtual(aba.path, location.pathname))
              ? 'secao-ativa'
              : undefined
          }
          onClick={(event) => {
            event.currentTarget.focus({ preventScroll: true });
            setMenu(true);
          }}
          aria-haspopup="dialog"
          aria-expanded={menu}
        >
          <Icone nome="mais" />
          <span>Mais</span>
        </button>
      </nav>
      <dialog
        className="menu-opcoes"
        ref={dialog}
        aria-labelledby="titulo-opcoes"
        onCancel={() => setMenu(false)}
        onClose={() => setMenu(false)}
      >
        <div className="menu-titulo">
          <h2 id="titulo-opcoes">Mais opções</h2>
          <button
            type="button"
            aria-label="Fechar opções"
            onClick={() => setMenu(false)}
          >
            <Icone nome="fechar" />
          </button>
        </div>
        <nav aria-label="Outras seções">
          <div className="menu-secoes">{secundarias.map(link)}</div>
          <Link
            to={{ pathname: '/tutorial', search: location.search }}
            onClick={() => setMenu(false)}
          >
            Tutorial
          </Link>
        </nav>
        <PreferenciaTema />
      </dialog>
    </div>
  );
}

import { ABAS } from './nav';

export const ROTAS_PROTEGIDAS = [
  ...ABAS,
  { path: '/aposta/:chave', title: 'Aposta' },
  { path: '/contas/:titularId', title: 'Contas do titular' },
  { path: '/painel/analises', title: 'Análises' },
  { path: '/painel/metas', title: 'Metas' },
  { path: '/configuracoes/conexoes', title: 'Conexões' },
  { path: '/configuracoes/privacidade', title: 'Privacidade' },
  { path: '/sistema', title: 'Sistema' },
] as const;

export const ROTAS_PUBLICAS = [
  { path: '/tutorial', title: 'Tutorial' },
  { path: '/extensao', title: 'Extensão' },
] as const;

export const ROTAS_AUTH = [
  { path: '/login', title: 'Entrar', protected: false },
  { path: '/criar-conta', title: 'Criar conta', protected: false },
  { path: '/esqueci-senha', title: 'Esqueci minha senha', protected: false },
  { path: '/redefinir-senha', title: 'Redefinir senha', protected: false },
  { path: '/confirmar-email', title: 'Confirmar e-mail', protected: false },
  { path: '/senha', title: 'Alterar senha', protected: true },
  { path: '/sair', title: 'Sair', protected: true },
] as const;

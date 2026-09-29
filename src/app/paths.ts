import { ABAS } from './nav';

export const ROTAS_PROTEGIDAS = [
  ...ABAS,
  { path: '/aposta/:chave', title: 'Aposta' },
  { path: '/configuracoes', title: 'Configurações' },
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

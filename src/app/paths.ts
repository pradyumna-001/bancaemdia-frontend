import { ABAS } from './nav';

export const ROTAS_PROTEGIDAS = [
  ...ABAS,
  { path: '/e-se', title: 'E se?' },
  { path: '/aposta/nova', title: 'Nova aposta' },
  { path: '/aposta/:chave', title: 'Aposta' },
  { path: '/aposta/:chave/foto', title: 'Foto da aposta' },
  { path: '/contas/:titularId', title: 'Contas do titular' },
  { path: '/contas/trocar', title: 'Trocar conta em uso' },
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

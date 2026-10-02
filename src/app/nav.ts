import type { NomeIcone } from '../components/Icone';
// Fonte única: rotas, topo, barra inferior e destinos do menu Mais.
export const ABAS = [
  {
    path: '/',
    title: 'Apostas',
    icone: 'apostas',
    mobile: true,
    desktop: true,
  },
  {
    path: '/painel',
    title: 'Painel',
    icone: 'painel',
    mobile: true,
    desktop: true,
  },
  {
    path: '/enviar',
    title: 'Enviar',
    icone: 'enviar',
    mobile: true,
    desktop: true,
  },
  {
    path: '/coleta',
    title: 'Coleta',
    icone: 'coleta',
    mobile: false,
    desktop: true,
  },
  {
    path: '/banca',
    title: 'Caixa',
    icone: 'caixa',
    mobile: false,
    desktop: true,
  },
  {
    path: '/resultados',
    title: 'Resultados',
    icone: 'resultados',
    mobile: false,
    desktop: true,
  },
  {
    path: '/revisao',
    title: 'Revisão',
    icone: 'revisao',
    mobile: true,
    desktop: true,
  },
  {
    path: '/contas',
    title: 'Contas e titulares',
    icone: 'contas',
    mobile: false,
    desktop: false,
  },
  {
    path: '/calculadoras',
    title: 'Calculadoras',
    icone: 'calculadoras',
    mobile: false,
    desktop: false,
  },
  {
    path: '/assinatura',
    title: 'Assinatura',
    icone: 'assinatura',
    mobile: false,
    desktop: false,
  },
  {
    path: '/configuracoes',
    title: 'Configurações',
    icone: 'configuracoes',
    mobile: false,
    desktop: false,
  },
] as const satisfies ReadonlyArray<{
  path: string;
  title: string;
  icone: NomeIcone;
  mobile: boolean;
  desktop: boolean;
}>;

export function abaAtual(path: string, pathname: string) {
  return path === '/'
    ? pathname === '/' || pathname.startsWith('/aposta/')
    : pathname === path || pathname.startsWith(`${path}/`);
}

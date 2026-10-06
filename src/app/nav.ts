import type { NomeIcone } from '../components/Icone';
import { TERMOS } from '../lib/termos';
// Fonte única: rotas, topo, barra inferior e destinos do menu Mais.
export const ABAS = [
  {
    path: '/',
    title: TERMOS.apostas,
    icone: 'apostas',
    mobile: true,
    desktop: true,
  },
  {
    path: '/painel',
    title: TERMOS.painel,
    icone: 'painel',
    mobile: true,
    desktop: true,
  },
  {
    path: '/enviar',
    title: TERMOS.enviar,
    icone: 'enviar',
    mobile: true,
    desktop: true,
  },
  {
    path: '/coleta',
    title: TERMOS.coleta,
    icone: 'coleta',
    mobile: false,
    desktop: true,
  },
  {
    path: '/banca',
    title: TERMOS.caixa,
    icone: 'caixa',
    mobile: false,
    desktop: true,
  },
  {
    path: '/resultados',
    title: TERMOS.resultados,
    icone: 'resultados',
    mobile: false,
    desktop: true,
  },
  {
    path: '/revisao',
    title: TERMOS.revisao,
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
    title: TERMOS.assinatura,
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

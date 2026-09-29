import type { NomeIcone } from '../components/Icone';
// Fonte única: rotas, topo, barra inferior e destinos do menu Mais.
export const ABAS = [
  { path: '/', title: 'Apostas', icone: 'apostas', mobile: true },
  { path: '/painel', title: 'Painel', icone: 'painel', mobile: true },
  { path: '/enviar', title: 'Enviar', icone: 'enviar', mobile: true },
  { path: '/coleta', title: 'Coleta', icone: 'coleta', mobile: false },
  { path: '/banca', title: 'Caixa', icone: 'caixa', mobile: false },
  {
    path: '/resultados',
    title: 'Resultados',
    icone: 'resultados',
    mobile: false,
  },
  { path: '/revisao', title: 'Revisão', icone: 'revisao', mobile: true },
] as const satisfies ReadonlyArray<{
  path: string;
  title: string;
  icone: NomeIcone;
  mobile: boolean;
}>;

export function abaAtual(path: string, pathname: string) {
  return path === '/'
    ? pathname === '/' || pathname.startsWith('/aposta/')
    : pathname === path;
}

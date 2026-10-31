import type { components } from '../../src/api/schema';
import { apostaExemplo } from './apostas';
import { titular } from './contas';
export function inicioResposta(path: string, present = false) {
  const pagination = { page: 1, page_size: 1, total: present ? 1 : 0 };
  if (path === '/api/v1/apostas')
    return {
      data: present ? [apostaExemplo] : [],
      pagination,
    } satisfies components['schemas']['BetsPageResponse'];
  if (path === '/api/v1/titulares')
    return {
      data: present ? [titular] : [],
      ...pagination,
    } satisfies components['schemas']['TitularesPaginaSaida'];
  if (path === '/api/v1/filtros/contas')
    return {
      dimensao: 'contas',
      data: present
        ? [{ id: '11', nome: 'Betano — Principal', ativa: false }]
        : [],
      pagination,
    } satisfies components['schemas']['OpcoesFiltro'];
}

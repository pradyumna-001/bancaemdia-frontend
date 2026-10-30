import { createElement, lazy, type ComponentType } from 'react';

/**
 * A lazy page whose module the route loader may start while the session is
 * still being consulted. Loading evaluates code only: nothing renders or reads
 * private data before the guard. Once the module has arrived, the guarded page
 * renders in the same pass instead of suspending for one more task (and one
 * more round trip before its first query); until then React.lazy applies.
 */
export function paginaCarregavel<P extends object, M>(
  importar: () => Promise<M>,
  escolher: (modulo: M) => ComponentType<P>,
) {
  let componente: ComponentType<P> | undefined;
  let pedido: Promise<{ default: ComponentType<P> }> | undefined;
  const carregar = () =>
    (pedido ??= importar().then((modulo) => {
      componente = escolher(modulo);
      return { default: componente };
    }));
  const Preguicosa = lazy(carregar) as unknown as ComponentType<P>;
  function Pagina(props: P) {
    return createElement(componente ?? Preguicosa, props);
  }
  // A failed download stays with React.lazy and the route error boundary.
  Pagina.carregar = () => void carregar().catch(() => {});
  return Pagina;
}

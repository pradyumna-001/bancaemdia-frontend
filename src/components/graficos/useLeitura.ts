import { useEffect, useState } from 'react';

/** Leitura persistente ao mover o ponteiro; Escape funciona também após hover. */
export function useLeitura() {
  const [selecionado, selecionar] = useState<number | null>(null);
  useEffect(() => {
    if (selecionado === null) return;
    const fechar = (event: KeyboardEvent) => {
      if (event.key === 'Escape') selecionar(null);
    };
    document.addEventListener('keydown', fechar);
    return () => document.removeEventListener('keydown', fechar);
  }, [selecionado]);
  return [selecionado, selecionar] as const;
}

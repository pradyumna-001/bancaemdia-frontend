/* Script clássico inserido no head antes de CSS, React e config. */
(() => {
  const chave = 'bancaemdia.tema';
  const raiz = document.documentElement;
  const sistema = window.matchMedia('(prefers-color-scheme: dark)');
  const assinantes = new Set();
  const validar = (valor) =>
    valor === 'claro' || valor === 'escuro' ? valor : 'sistema';
  let preferencia = 'sistema';
  try {
    preferencia = validar(window.localStorage.getItem(chave));
  } catch {
    // Storage bloqueado: a preferência continua funcionando nesta aba.
  }
  const aplicar = () => {
    raiz.dataset.tema =
      preferencia === 'sistema'
        ? sistema.matches
          ? 'escuro'
          : 'claro'
        : preferencia;
    assinantes.forEach((avisar) => avisar());
  };
  window.bancaemdiaTema = {
    ler: () => preferencia,
    definir: (valor) => {
      preferencia = validar(valor);
      aplicar();
      try {
        window.localStorage.setItem(chave, preferencia);
      } catch {
        // Não impedir o uso quando persistência estiver indisponível.
      }
    },
    assinar: (avisar) => {
      assinantes.add(avisar);
      return () => assinantes.delete(avisar);
    },
  };
  sistema.addEventListener('change', aplicar);
  window.addEventListener('storage', (evento) => {
    if (evento.key !== chave && evento.key !== null) return;
    try {
      if (evento.storageArea !== window.localStorage) return;
    } catch {
      return;
    }
    preferencia = validar(evento.newValue);
    aplicar();
  });
  aplicar();
})();

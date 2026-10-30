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

// Public deployment configuration can arrive while the application JS downloads.
// No cookie, referrer, identity or URL parameter participates in this request.
(() => {
  try {
    if (
      !document.getElementById('rotas-iniciais') ||
      Object.hasOwn(window, 'bancaemdiaConfigInicial')
    )
      return;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    let pending = fetch('/config.json', {
      cache: 'no-store',
      credentials: 'omit',
      redirect: 'error',
      referrerPolicy: 'no-referrer',
      signal: controller.signal,
    })
      .then(async (response) => {
        const ready = response.clone();
        // Buffer the public body before ending the same five-second deadline.
        await response.arrayBuffer();
        return ready;
      })
      .finally(() => clearTimeout(timer));
    void pending.catch(() => {});
    Object.defineProperty(window, 'bancaemdiaConfigInicial', {
      value: () => {
        const result = pending;
        pending = undefined;
        return result;
      },
    });
  } catch {
    // The normal validated loader remains available if early fetch is absent.
  }
})();

// Fetch only this route's public build assets while the initial entry loads.
// Query parameters and private data are never read; guards still own access.
(() => {
  try {
    const content = document
      .getElementById('rotas-iniciais')
      ?.getAttribute('content');
    if (!content) return;
    const parts = window.location.pathname.replace(/\/$/, '').split('/');
    const route = JSON.parse(content).find(({ path }) => {
      const pattern = path.replace(/\/$/, '').split('/');
      return (
        pattern.length === parts.length &&
        pattern.every((part, i) =>
          part.startsWith(':') ? !!parts[i] : part === parts[i],
        )
      );
    });
    const styles = [];
    for (const file of route?.files ?? []) {
      if (!/^assets\/[\w.-]+\.(js|css)$/.test(file)) continue;
      const link = document.createElement('link');
      link.href = '/' + file;
      link.crossOrigin = '';
      link.referrerPolicy = 'no-referrer';
      link.rel = file.endsWith('.js') ? 'modulepreload' : 'preload';
      if (file.endsWith('.css')) {
        link.as = 'style';
        styles.push(
          new Promise((resolve) => {
            link.addEventListener('load', () => resolve(link), { once: true });
            link.addEventListener('error', () => resolve(null), { once: true });
          }),
        );
      }
      document.head.append(link);
    }
    if (styles.length)
      void Promise.all(styles)
        .then((loaded) => {
          const apply = () => {
            if (document.readyState === 'loading') return;
            document.removeEventListener('readystatechange', apply);
            for (const link of loaded) {
              // Keep the normal Vite loader in charge if it already requested CSS.
              // Promote only completed preloads, after the entry styles in the DOM.
              if (
                !link ||
                document.querySelector(
                  `link[rel="stylesheet"][href="${link.getAttribute('href')}"]`,
                )
              )
                continue;
              link.rel = 'stylesheet';
              link.removeAttribute('as');
              document.head.append(link);
            }
          };
          if (document.readyState === 'loading')
            document.addEventListener('readystatechange', apply);
          else apply();
        })
        .catch(() => {});
  } catch {
    // A failed hint cannot prevent theme resolution or normal route loading.
  }
})();

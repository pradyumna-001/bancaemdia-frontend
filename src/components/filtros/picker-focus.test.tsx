import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { EscolhaFiltro } from './EscolhaFiltro';
import { DataFiltro } from './DataFiltro';

it.each(['escolha', 'data'])(
  'fechamento atrasado de %s preserva o próximo gesto de teclado',
  (kind) => {
    const { container } = render(
      <>
        {kind === 'escolha' ? (
          <EscolhaFiltro label="Filtro" options={[]} onChange={vi.fn()} />
        ) : (
          <DataFiltro label="Filtro" onChange={vi.fn()} />
        )}
        <input aria-label="Próximo campo" />
      </>,
    );
    const next = screen.getByLabelText('Próximo campo');
    const dialog = container.querySelector('dialog')!;
    next.focus();
    fireEvent(dialog, new Event('close'));
    expect(next).toHaveFocus();
    // If no next gesture happened, still recover focus from the hidden dialog.
    next.blur();
    fireEvent(dialog, new Event('close'));
    expect(screen.getByRole('button', { name: /^Filtro / })).toHaveFocus();
  },
);

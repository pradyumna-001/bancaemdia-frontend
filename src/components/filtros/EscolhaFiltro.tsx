import { useId, useRef, useState, type ReactNode } from 'react';
import './filtros.css';
export type OpcaoFiltro = Readonly<{
  value: string;
  label: string;
  nome?: string;
}>;
export function EscolhaFiltro({
  id: controlId,
  label,
  value,
  options,
  onChange,
  onOpen,
  disabled = false,
  resetLabel = 'Sem filtro',
  selectedLabel,
  busca,
  children,
  dentroDeFormulario = false,
}: {
  id?: string;
  label: string;
  value?: string;
  options: readonly OpcaoFiltro[];
  onChange: (value?: string) => void;
  onOpen?: () => void;
  disabled?: boolean;
  resetLabel?: string;
  selectedLabel?: string;
  busca?: {
    consulta: string;
    buscar: (q: string) => void;
    atualizando?: boolean;
  };
  children?: ReactNode;
  dentroDeFormulario?: boolean;
}) {
  const id = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const [texto, setTexto] = useState('');
  // The dialog's contents exist only while it is open: a filter panel has
  // many pickers, and every render would otherwise build all their options.
  const [aberto, setAberto] = useState(false);
  const Busca = dentroDeFormulario ? 'div' : 'form';
  function choose(next?: string) {
    onChange(next);
    dialog.current!.close();
  }
  return (
    <div className="filtro-escolha">
      <span id={id + '-label'}>{label}</span>
      <button
        id={controlId}
        ref={trigger}
        type="button"
        disabled={disabled}
        aria-labelledby={id + '-label ' + id + '-valor'}
        aria-haspopup="dialog"
        aria-controls={id}
        onClick={(event) => {
          event.currentTarget.focus({ preventScroll: true });
          setTexto(busca?.consulta ?? '');
          setAberto(true);
          onOpen?.();
          dialog.current!.showModal();
        }}
      >
        <span id={id + '-valor'}>
          {selectedLabel ??
            options.find((option) => option.value === value)?.label ??
            (value ? 'Identificador ' + value : 'Sem filtro')}
        </span>
      </button>
      <dialog
        ref={dialog}
        id={id}
        className="filtro-dialog"
        aria-labelledby={id + '-titulo'}
        onClose={() => {
          setAberto(false);
          const active = document.activeElement;
          if (
            !active ||
            active === document.body ||
            dialog.current?.contains(active)
          )
            trigger.current?.focus();
        }}
      >
        {aberto && (
          <>
            <h2 id={id + '-titulo'}>{label}</h2>
            {busca && (
              <Busca
                onKeyDown={(event) => {
                  if (dentroDeFormulario && event.key === 'Enter') {
                    event.preventDefault();
                    busca.buscar(texto);
                  }
                }}
                onSubmit={(event) => {
                  event.preventDefault();
                  busca.buscar(texto);
                }}
              >
                <label htmlFor={id + '-busca'}>
                  Buscar {label.toLowerCase()}
                </label>
                <input
                  id={id + '-busca'}
                  type="text"
                  maxLength={160}
                  value={texto}
                  onChange={(event) => setTexto(event.target.value)}
                />
                <button
                  type={dentroDeFormulario ? 'button' : 'submit'}
                  disabled={busca.atualizando}
                  onClick={
                    dentroDeFormulario ? () => busca.buscar(texto) : undefined
                  }
                >
                  Buscar
                </button>
              </Busca>
            )}
            <div className="filtro-opcoes">
              <button
                type="button"
                aria-pressed={!value}
                onClick={() => choose()}
              >
                {resetLabel}
              </button>
              {options.map((option) => (
                <button
                  type="button"
                  key={option.value}
                  aria-pressed={option.value === value}
                  onClick={() => choose(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
            {children}
            <button type="button" onClick={() => dialog.current!.close()}>
              Fechar opções
            </button>
          </>
        )}
      </dialog>
    </div>
  );
}

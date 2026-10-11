import { useId, useRef, useState, type ReactNode } from 'react';
export type OpcaoFiltro = Readonly<{ value: string; label: string }>;
export function EscolhaFiltro({
  label,
  value,
  options,
  onChange,
  disabled = false,
  resetLabel = 'Sem filtro',
  selectedLabel,
  busca,
  children,
}: {
  label: string;
  value?: string;
  options: readonly OpcaoFiltro[];
  onChange: (value?: string) => void;
  disabled?: boolean;
  resetLabel?: string;
  selectedLabel?: string;
  busca?: {
    consulta: string;
    buscar: (q: string) => void;
    atualizando?: boolean;
  };
  children?: ReactNode;
}) {
  const id = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const [texto, setTexto] = useState('');
  function choose(next?: string) {
    onChange(next);
    dialog.current!.close();
  }
  return (
    <div className="filtro-escolha">
      <span id={id + '-label'}>{label}</span>
      <button
        ref={trigger}
        type="button"
        disabled={disabled}
        aria-labelledby={id + '-label ' + id + '-valor'}
        aria-haspopup="dialog"
        aria-controls={id}
        onClick={() => {
          setTexto(busca?.consulta ?? '');
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
        onClose={() => trigger.current!.focus()}
      >
        <h2 id={id + '-titulo'}>{label}</h2>
        {busca && (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              busca.buscar(texto);
            }}
          >
            <label htmlFor={id + '-busca'}>Buscar {label.toLowerCase()}</label>
            <input
              id={id + '-busca'}
              type="text"
              maxLength={160}
              value={texto}
              onChange={(event) => setTexto(event.target.value)}
            />
            <button type="submit" disabled={busca.atualizando}>
              Buscar
            </button>
          </form>
        )}
        <div className="filtro-opcoes">
          <button type="button" aria-pressed={!value} onClick={() => choose()}>
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
      </dialog>
    </div>
  );
}

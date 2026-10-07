import { useId, useRef } from 'react';
export type OpcaoFiltro = Readonly<{ value: string; label: string }>;
export function EscolhaFiltro({
  label,
  value,
  options,
  onChange,
  disabled = false,
  resetLabel = 'Sem filtro',
}: {
  label: string;
  value?: string;
  options: readonly OpcaoFiltro[];
  onChange: (value?: string) => void;
  disabled?: boolean;
  resetLabel?: string;
}) {
  const id = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
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
        onClick={() => dialog.current!.showModal()}
      >
        <span id={id + '-valor'}>
          {options.find((option) => option.value === value)?.label ??
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
        <button type="button" onClick={() => dialog.current!.close()}>
          Fechar opções
        </button>
      </dialog>
    </div>
  );
}

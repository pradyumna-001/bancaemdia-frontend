import { useEffect, useId, useRef, useState } from 'react';
import { FUSOS_RAPIDOS, fusosDisponiveis, nomeFuso } from './fuso';

export function SeletorFuso({
  value,
  disabled,
  onChange,
  inputId,
}: {
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
  inputId: string;
}) {
  const id = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (open) dialog.current?.showModal();
    else dialog.current?.close();
  }, [open]);
  const normalized = (text: string) =>
    text
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  const choices = open
    ? fusosDisponiveis(value).filter((zone) =>
        search.trim()
          ? normalized(nomeFuso(zone)).includes(normalized(search))
          : zone === value || FUSOS_RAPIDOS.includes(zone),
      )
    : [];
  const close = () => {
    setOpen(false);
    setSearch('');
    trigger.current?.focus();
  };
  return (
    <>
      <label id={`${id}-label`} htmlFor={inputId}>
        Fuso das análises
      </label>
      <button
        id={inputId}
        ref={trigger}
        type="button"
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        {nomeFuso(value)} · Alterar
      </button>
      <dialog
        ref={dialog}
        className="fuso-dialog"
        aria-labelledby={`${id}-titulo`}
        onCancel={close}
        onClose={close}
        onKeyDownCapture={(event) => {
          if (event.key === 'Escape') {
            event.preventDefault();
            close();
          }
        }}
      >
        {open && (
          <>
            <h3 id={`${id}-titulo`}>Escolher fuso das análises</h3>
            <p>Seleção rápida. Busque sua cidade para ver outros fusos.</p>
            <label htmlFor={`${id}-busca`}>Buscar cidade ou região</label>
            <input
              id={`${id}-busca`}
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <div
              className="fuso-opcoes"
              role="group"
              aria-label="Fusos disponíveis"
            >
              {choices.map((zone) => (
                <button
                  type="button"
                  key={zone}
                  aria-pressed={zone === value}
                  onClick={() => {
                    onChange(zone);
                    close();
                  }}
                >
                  {nomeFuso(zone)}
                  {zone === value ? ' · Selecionado' : ''}
                </button>
              ))}
              {!choices.length && (
                <p role="status">
                  Nenhum fuso encontrado. Tente outra cidade ou região.
                </p>
              )}
            </div>
            <button type="button" onClick={close}>
              Voltar
            </button>
          </>
        )}
      </dialog>
    </>
  );
}

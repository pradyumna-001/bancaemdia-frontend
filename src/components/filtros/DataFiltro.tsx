import { useId, useRef, useState, type KeyboardEvent } from 'react';
import { diaCivil, diaValido, deslocarDia } from '../../lib/datasFiltro';
const dateLabel = (day: string) =>
  new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'UTC',
    dateStyle: 'long',
  }).format(new Date(day + 'T12:00:00Z'));
export function DataFiltro({
  label,
  value,
  onChange,
}: {
  label: string;
  value?: string;
  onChange: (value?: string) => void;
}) {
  const id = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const [day, setDay] = useState(() => diaCivil(new Date()));
  const month = day.slice(0, 7);
  const first = month + '-01';
  const weekday = new Date(first + 'T12:00:00Z').getUTCDay();
  const start = deslocarDia(first, -weekday);
  const days = Array.from({ length: 42 }, (_, index) =>
    deslocarDia(start, index),
  );
  function focusDay(next: string) {
    if (!diaValido(next)) return;
    setDay(next);
    requestAnimationFrame(() => {
      if (dialog.current?.open)
        dialog.current
          .querySelector<HTMLButtonElement>('[data-dia="' + next + '"]')
          ?.focus();
    });
  }
  function moveMonth(offset: number) {
    const date = new Date(day + 'T12:00:00Z');
    date.setUTCDate(1);
    date.setUTCMonth(date.getUTCMonth() + offset);
    const next = date.toISOString().split('T')[0]!;
    if (diaValido(next)) focusDay(next);
  }
  function keyboard(event: KeyboardEvent<HTMLButtonElement>, current: string) {
    const shifts: Record<string, number> = {
      ArrowLeft: -1,
      ArrowRight: 1,
      ArrowUp: -7,
      ArrowDown: 7,
      Home: -new Date(current + 'T12:00:00Z').getUTCDay(),
      End: 6 - new Date(current + 'T12:00:00Z').getUTCDay(),
    };
    if (Object.hasOwn(shifts, event.key)) {
      event.preventDefault();
      focusDay(deslocarDia(current, shifts[event.key]!));
    } else if (event.key === 'PageUp' || event.key === 'PageDown') {
      event.preventDefault();
      moveMonth(event.key === 'PageUp' ? -1 : 1);
    }
  }
  function choose(next?: string) {
    onChange(next);
    dialog.current!.close();
  }
  return (
    <div className="filtro-escolha">
      <span id={id + '-label'}>{label}</span>
      <button
        type="button"
        ref={trigger}
        aria-labelledby={id + '-label ' + id + '-valor'}
        aria-haspopup="dialog"
        onClick={() => {
          dialog.current!.showModal();
          focusDay(value ?? diaCivil(new Date()));
        }}
      >
        <span id={id + '-valor'}>
          {value ? dateLabel(value) : 'Sem limite'}
        </span>
      </button>
      <dialog
        className="filtro-dialog"
        ref={dialog}
        aria-labelledby={id + '-titulo'}
        onClose={() => trigger.current!.focus()}
      >
        <h2 id={id + '-titulo'}>{label}</h2>
        <p>Datas no fuso de São Paulo. O dia final inteiro é incluído.</p>
        <div className="filtro-mes">
          <button type="button" onClick={() => moveMonth(-1)}>
            Mês anterior
          </button>
          <span aria-live="polite">
            {new Intl.DateTimeFormat('pt-BR', {
              timeZone: 'UTC',
              month: 'long',
              year: 'numeric',
            }).format(new Date(day + 'T12:00:00Z'))}
          </span>
          <button type="button" onClick={() => moveMonth(1)}>
            Próximo mês
          </button>
        </div>
        <div
          className="filtro-calendario"
          role="group"
          aria-label="Dias do mês"
        >
          {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((name) => (
            <span key={name} aria-hidden="true">
              {name}
            </span>
          ))}
          {days.map((date) => (
            <button
              type="button"
              key={date}
              data-dia={date}
              disabled={!diaValido(date)}
              tabIndex={date === day ? 0 : -1}
              aria-label={'Selecionar ' + dateLabel(date)}
              aria-pressed={value === date}
              className={date.slice(0, 7) === month ? '' : 'dia-vizinho'}
              onKeyDown={(event) => keyboard(event, date)}
              onClick={() => choose(date)}
            >
              {Number(date.slice(-2))}
            </button>
          ))}
        </div>
        <div className="filtro-atalhos">
          <button type="button" onClick={() => choose(diaCivil(new Date()))}>
            Hoje
          </button>
          <button
            type="button"
            onClick={() => choose(deslocarDia(diaCivil(new Date()), -1))}
          >
            Ontem
          </button>
          <button type="button" onClick={() => choose()}>
            Remover limite
          </button>
          <button type="button" onClick={() => dialog.current!.close()}>
            Fechar calendário
          </button>
        </div>
      </dialog>
    </div>
  );
}

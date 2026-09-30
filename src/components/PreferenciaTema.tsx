import { useId, useSyncExternalStore } from 'react';
import './PreferenciaTema.css';
type Preferencia = 'sistema' | 'claro' | 'escuro';
declare global {
  interface Window {
    bancaemdiaTema?: {
      ler: () => Preferencia;
      definir: (valor: Preferencia) => void;
      assinar: (avisar: () => void) => () => void;
    };
  }
}
const ler = () => window.bancaemdiaTema?.ler() ?? 'sistema';
const assinar = (avisar: () => void) =>
  window.bancaemdiaTema?.assinar(avisar) ?? (() => {});
export function PreferenciaTema() {
  const preferencia = useSyncExternalStore(assinar, ler);
  const nome = useId();
  return (
    <fieldset className="preferencia-tema">
      <legend>Aparência</legend>
      <div className="preferencia-tema-opcoes">
        {(['sistema', 'claro', 'escuro'] as const).map((valor) => (
          <label key={valor}>
            <input
              type="radio"
              name={nome}
              value={valor}
              checked={preferencia === valor}
              onChange={() => window.bancaemdiaTema?.definir(valor)}
            />
            <span>
              {valor === 'sistema'
                ? 'Sistema'
                : valor === 'claro'
                  ? 'Claro'
                  : 'Escuro'}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

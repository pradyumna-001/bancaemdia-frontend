import { rotuloEstado } from '../lib/termos';
import './valores.css';

/** Não deduz resultado, stake ou lucro do estado recebido. */
export function EstadoAposta({ estado }: { estado: string | null }) {
  return <span className="estado-aposta">{rotuloEstado(estado)}</span>;
}

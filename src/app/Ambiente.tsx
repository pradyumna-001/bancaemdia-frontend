import type { AppEnvironment } from '../lib/config';

export function Ambiente({ ambiente }: { ambiente: AppEnvironment }) {
  if (ambiente === 'production') return null;
  return (
    <aside className="ambiente-teste" aria-label="Ambiente de teste">
      <span role="note">
        Cópia de teste ·{' '}
        {ambiente === 'staging' ? 'Homologação' : 'Desenvolvimento'}
      </span>
    </aside>
  );
}

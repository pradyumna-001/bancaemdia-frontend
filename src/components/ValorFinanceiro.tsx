import { moeda, type InteiroExato } from '../lib/format';
import { TERMOS } from '../lib/termos';
import './valores.css';

export function ValorFinanceiro({
  campo,
  valor,
}: {
  campo: 'face' | 'custo' | 'retorno' | 'lucro' | 'saldo';
  valor: InteiroExato | null;
}) {
  let texto;
  try {
    texto = moeda(valor, campo === 'lucro');
  } catch {
    texto = 'Valor indisponível';
  }
  return (
    <span className="valor-financeiro">
      <span>{TERMOS[campo]}</span>
      <strong className="numero valor-numero">{texto}</strong>
    </span>
  );
}

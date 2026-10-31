import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { ValorFinanceiro } from './ValorFinanceiro';
import { EstadoAposta } from './EstadoAposta';

it('freebet conserva valor de face e custo próprio fornecidos separadamente', () => {
  render(
    <>
      <ValorFinanceiro campo="face" valor={10000} />
      <ValorFinanceiro campo="custo" valor={0} />
      <ValorFinanceiro campo="retorno" valor={24000} />
      <ValorFinanceiro campo="lucro" valor={14000} />
    </>,
  );
  expect(screen.getByText('Valor de face').parentElement).toHaveTextContent(
    'R$ 100,00',
  );
  expect(screen.getByText('Custo próprio').parentElement).toHaveTextContent(
    'R$ 0,00',
  );
  expect(screen.getByText('Retorno').parentElement).toHaveTextContent(
    'R$ 240,00',
  );
  expect(screen.getByText('Lucro').parentElement).toHaveTextContent(
    '+R$ 140,00',
  );
});
it('saldo desconhecido nunca vira zero e erro de precisão não mata a tela', () => {
  const { rerender } = render(<ValorFinanceiro campo="saldo" valor={null} />);
  expect(screen.getByText('Não informado')).toBeVisible();
  rerender(<ValorFinanceiro campo="saldo" valor={0} />);
  expect(screen.getByText('R$ 0,00')).toBeVisible();
  rerender(
    <ValorFinanceiro campo="saldo" valor={Number.MAX_SAFE_INTEGER + 1} />,
  );
  expect(screen.getByText('Valor indisponível')).toBeVisible();
});
it('renderiza limites exatos e estados parciais em texto', () => {
  render(
    <>
      <ValorFinanceiro campo="lucro" valor={-9223372036854775808n} />
      <EstadoAposta estado="MEIO_GREEN" />
      <EstadoAposta estado="MEIO_RED" />
      <EstadoAposta estado="CORPO_PRIVADO" />
    </>,
  );
  expect(screen.getByText('−R$ 92.233.720.368.547.758,08')).toBeVisible();
  expect(screen.getByText('Meio green')).toBeVisible();
  expect(screen.getByText('Meio red')).toBeVisible();
  expect(screen.getByText('Estado desconhecido')).toBeVisible();
  expect(screen.queryByText('CORPO_PRIVADO')).not.toBeInTheDocument();
});

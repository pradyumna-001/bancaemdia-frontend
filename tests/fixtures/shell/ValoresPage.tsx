// Ensaio de componentes; não é uma página do produto nem oferta de assinatura.
import { ValorFinanceiro } from '../../../src/components/ValorFinanceiro';
import { EstadoAposta } from '../../../src/components/EstadoAposta';
import { PreferenciaTema } from '../../../src/components/PreferenciaTema';
import { ESTADOS_APOSTA } from '../../../src/lib/termos';
import {
  dataHora,
  decimal,
  odd,
  porcentagem,
  precoAssinatura,
} from '../../../src/lib/format';

export function ValoresPage() {
  return (
    <main className="pagina">
      <h1>Ensaio de valores</h1>
      <p>Dados somente de teste, sem sessão ou oferta comercial.</p>
      <p>
        <ValorFinanceiro campo="face" valor={10000} />
      </p>
      <p>
        <ValorFinanceiro campo="custo" valor={0} />
      </p>
      <p>
        <ValorFinanceiro campo="retorno" valor={24000} />
      </p>
      <p>
        <ValorFinanceiro campo="lucro" valor={14000} />
      </p>
      <p>
        <ValorFinanceiro campo="saldo" valor={null} />
      </p>
      <p>
        <ValorFinanceiro campo="saldo" valor={0} />
      </p>
      <p>
        <ValorFinanceiro campo="lucro" valor={-9223372036854775808n} />
      </p>
      <p>
        <ValorFinanceiro campo="saldo" valor={Number.MAX_SAFE_INTEGER + 1} />
      </p>
      <p className="numero valor-numero">
        {decimal('9007199254740993.123456789')}
      </p>
      <p>
        Odd: <span className="numero">{odd('2.1234')}</span>
      </p>
      <p>
        Porcentagem: <span className="numero">{porcentagem('0.125')}</span>
      </p>
      <p className="valor-numero">
        {dataHora('2026-10-06T01:30:00Z', 'America/Sao_Paulo')}
      </p>
      <p>{precoAssinatura(500, 'JPY', 'MONTHLY')}</p>
      {Object.keys(ESTADOS_APOSTA).map((estado) => (
        <p key={estado}>
          <EstadoAposta estado={estado} />
        </p>
      ))}
      <EstadoAposta estado="PRIVADO_INVALIDO" />
      <PreferenciaTema />
    </main>
  );
}

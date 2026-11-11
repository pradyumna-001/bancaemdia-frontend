import { useId, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { getApiClient, type createApiClient } from '../../api/client';
import { ApiError } from '../../api/error';
import { ErroApi } from '../../components/ErroApi';
import { quantidade } from '../../lib/format';
import {
  PARAM_APAGAR,
  PARAM_LOTE,
  PARAM_RESTAURAR,
  fraseConfere,
  instante,
} from './lote';
import { useLote } from './useLote';

const consulta = (params: URLSearchParams) =>
  params.toString() ? '?' + params.toString() : '';
const apostas = (total: number) =>
  `${quantidade(total)} ${total === 1 ? 'aposta' : 'apostas'}`;

// Known refusals of the batch contract, in the owner's words.
const RECUSAS: Record<string, string> = {
  confirmacao_desatualizada:
    'Suas apostas mudaram depois da prévia. Nada foi apagado; prepare a exclusão de novo.',
  confirmacao_expirada:
    'A prévia venceu. Nada foi apagado; prepare a exclusão de novo.',
  confirmacao_invalida:
    'A confirmação não vale para esta conta. Nada foi apagado; prepare a exclusão de novo.',
  frase_incorreta: 'A frase digitada não confere. Nada foi apagado.',
  nada_a_apagar: 'Não há apostas ativas para apagar.',
  lote_em_curso:
    'Outra exclusão ou restauração está em andamento. Nada foi feito por este pedido; tente de novo em instantes.',
  lote_restaurado: 'Este lote já foi restaurado. Um lote restaura uma vez.',
  lote_nao_encontrado: 'Este lote não foi encontrado nesta conta.',
};

function Recusa({ error }: { error: unknown }) {
  const known =
    error instanceof ApiError && error.code ? RECUSAS[error.code] : undefined;
  if (known)
    return (
      <p role="alert" className="lote-recusa">
        {known}
      </p>
    );
  return <ErroApi error={error} intent="gravacao" />;
}

export function ApagarApostas({
  client,
}: {
  client?: ReturnType<typeof createApiClient>;
}) {
  const api = client ?? getApiClient();
  const location = useLocation();
  const fraseId = useId();
  const [digitada, setDigitada] = useState('');
  const lote = useLote(api);
  const { previa, tentativa, fase } = lote;
  const ocupado = lote.busy || lote.waiting;
  const filtros = new URLSearchParams(location.search);
  for (const name of [PARAM_APAGAR, PARAM_RESTAURAR, PARAM_LOTE])
    filtros.delete(name);
  const apagadas = new URLSearchParams(filtros);
  apagadas.set('apagadas', '1');
  const recibo = lote.lote.data;
  const operacao = tentativa?.operacao === 'RESTAURAR' ? 'restaurar' : 'apagar';

  return (
    <section className="configuracoes-card" aria-labelledby="apagar-titulo">
      <h2 id="apagar-titulo">Apagar todas as apostas</h2>
      <p>
        Apaga de uma vez todas as suas apostas ativas. Elas ficam apagadas, não
        removidas: aparecem ao incluir apagadas e podem voltar pela restauração
        do lote. Caixa, contas, bancas, titulares, assinatura e conexões não
        mudam.
      </p>
      <p className="legenda">
        Isto não exporta seus dados nem encerra a conta; para isso, use{' '}
        <Link to={'/configuracoes/privacidade' + consulta(filtros)}>
          Privacidade
        </Link>
        .
      </p>

      {!tentativa && !previa && (
        <button
          type="button"
          disabled={ocupado}
          onClick={() => {
            setDigitada('');
            void lote.preparar();
          }}
        >
          Preparar exclusão
        </button>
      )}
      {!tentativa && lote.error !== undefined && <Recusa error={lote.error} />}

      {!tentativa && previa && previa.total === 0 && (
        <div role="status">
          <p>Não há apostas ativas para apagar.</p>
          <button type="button" onClick={lote.cancelar}>
            Fechar
          </button>
        </div>
      )}
      {!tentativa && previa && previa.total > 0 && (
        <form
          className="lote-confirmacao"
          onSubmit={(event) => {
            event.preventDefault();
            if (fraseConfere(digitada, previa.frase)) lote.apagar(digitada);
          }}
        >
          <p>
            Serão apagadas{' '}
            <strong className="numero">{apostas(previa.total)}</strong> ativas.
            Esta prévia vale até {instante(previa.expira_em)} (horário de
            Brasília).
          </p>
          <label htmlFor={fraseId}>
            Para confirmar, digite <strong>{previa.frase}</strong>
          </label>
          <input
            id={fraseId}
            value={digitada}
            autoComplete="off"
            spellCheck={false}
            onChange={(event) => setDigitada(event.target.value)}
            disabled={ocupado}
          />
          {!lote.podeApagar && (
            <p className="legenda">
              Com a conta em modo de leitura, as apostas podem ser consultadas,
              mas não apagadas.
            </p>
          )}
          <div className="lote-acoes">
            <button
              type="submit"
              disabled={
                ocupado ||
                !lote.podeApagar ||
                !fraseConfere(digitada, previa.frase)
              }
            >
              Apagar {apostas(previa.total)}
            </button>
            <button type="button" disabled={ocupado} onClick={lote.cancelar}>
              Cancelar
            </button>
          </div>
        </form>
      )}

      {tentativa && fase === 'sending' && (
        <p role="status">
          {operacao === 'apagar'
            ? 'Apagando as apostas…'
            : 'Restaurando as apostas…'}
        </p>
      )}
      {tentativa && fase === 'uncertain' && (
        <div role="status" className="lote-incerto">
          <p>
            Não foi possível confirmar se o pedido para {operacao} as apostas
            foi gravado. Consulte o resultado antes de qualquer nova tentativa.
          </p>
          {lote.error !== undefined && (
            <ErroApi error={lote.error} intent="leitura" />
          )}
          <button
            type="button"
            disabled={ocupado}
            onClick={() => void lote.consultar()}
          >
            Consultar resultado
          </button>
        </div>
      )}
      {tentativa && fase === 'notFound' && (
        <div role="status" className="lote-incerto">
          <p>
            Não encontramos registro deste pedido. Isso não prova que nada foi
            feito.{' '}
            {lote.podeReenviar
              ? 'Reenviar usa o mesmo pedido: se ele já tiver sido gravado, o serviço devolve o resultado original.'
              : 'O pedido original não está mais nesta página; descarte-o e prepare de novo, se ainda quiser.'}
          </p>
          {lote.podeReenviar && (
            <button
              type="button"
              disabled={
                ocupado ||
                !(operacao === 'apagar' ? lote.podeApagar : lote.podeRestaurar)
              }
              onClick={lote.reenviar}
            >
              Reenviar o mesmo pedido
            </button>
          )}
          <button type="button" disabled={ocupado} onClick={lote.descartar}>
            Descartar este pedido
          </button>
        </div>
      )}

      {lote.loteId && (
        <section className="lote-recibo" aria-labelledby="lote-titulo">
          <h3 id="lote-titulo">Lote de exclusão</h3>
          {lote.lote.isPending && <p role="status">Consultando o lote…</p>}
          {lote.lote.error && (
            <>
              <Recusa error={lote.lote.error} />
              {!(
                lote.lote.error instanceof ApiError &&
                lote.lote.error.status === 404
              ) && (
                <button
                  type="button"
                  disabled={lote.lote.isFetching}
                  onClick={() => void lote.lote.refetch()}
                >
                  Consultar o lote de novo
                </button>
              )}
            </>
          )}
          {recibo && (
            <>
              <p>
                <strong className="numero">
                  {apostas(recibo.apostas_afetadas)}
                </strong>{' '}
                {recibo.apostas_afetadas === 1 ? 'apagada' : 'apagadas'} em{' '}
                {instante(recibo.criado_em)}.
              </p>
              {recibo.restaurado_em !== null &&
              recibo.apostas_restauradas !== null ? (
                <p>
                  Lote restaurado em {instante(recibo.restaurado_em)}:{' '}
                  <strong className="numero">
                    {apostas(recibo.apostas_restauradas)}
                  </strong>{' '}
                  {recibo.apostas_restauradas === 1 ? 'voltou' : 'voltaram'}. Um
                  lote restaura uma vez.
                </p>
              ) : (
                <>
                  <p className="legenda">
                    A restauração devolve só as apostas que este lote apagou e
                    que continuam apagadas.
                  </p>
                  {!tentativa && (
                    <button
                      type="button"
                      disabled={ocupado || !lote.podeRestaurar}
                      onClick={lote.restaurar}
                    >
                      Restaurar apostas deste lote
                    </button>
                  )}
                  {!lote.podeRestaurar && (
                    <p className="legenda">
                      Com a conta em modo de leitura, o lote pode ser
                      consultado, mas não restaurado.
                    </p>
                  )}
                </>
              )}
              <p className="legenda">
                Painel, análises e saldo podem levar alguns instantes para
                refletir a mudança.
              </p>
            </>
          )}
          <div className="lote-acoes">
            <Link to={'/apostas?' + apagadas.toString()}>
              Ver apostas, incluindo apagadas
            </Link>
            {!tentativa && (
              <button type="button" disabled={ocupado} onClick={lote.fechar}>
                Fechar acompanhamento
              </button>
            )}
          </div>
        </section>
      )}
    </section>
  );
}

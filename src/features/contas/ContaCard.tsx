import { useState } from 'react';
import type { createApiClient } from '../../api/client';
import type { components } from '../../api/schema';
import { EscolhaFiltro } from '../../components/filtros/EscolhaFiltro';
import {
  ESTADOS,
  horario,
  validar,
  contaValidada,
  type Conta,
} from './protocol';
import type { useEscrita } from './useEscrita';

export function ContaCard({
  account,
  client,
  write,
}: {
  account: Conta;
  client: ReturnType<typeof createApiClient>;
  write: ReturnType<typeof useEscrita>;
}) {
  const [edit, setEdit] = useState(false);
  const [nickname, setNickname] = useState(account.apelido);
  const [state, setState] =
    useState<components['schemas']['ContaEdicao']['estado']>();
  const titular = account.titular_id;
  const params = {
    path: { titular_id: titular!, conta_id: account.conta_casa_id },
  };
  const editable =
    titular !== null &&
    account.acoes_validas.includes('EDITAR') &&
    write.can('PATCH /api/v1/titulares/{titular_id}/contas/{conta_id}');
  return (
    <article className="contas-caixa">
      <h3>{account.apelido}</h3>
      <p>
        {account.casa_nome} · {account.titular_nome ?? 'Sem titular'}
      </p>
      <p className="contas-estado">{ESTADOS[account.estado]}</p>
      <details>
        <summary>Histórico de uso</summary>
        {account.intervalo_ativo && (
          <p>
            Em uso desde {horario(account.intervalo_ativo.vigente_de)} ·{' '}
            {account.intervalo_ativo.origem === 'LEGADO'
              ? 'Registro legado'
              : 'Atribuição explícita'}
          </p>
        )}
        {account.historico_uso.length ? (
          <ol>
            {account.historico_uso.map((period, index) => (
              <li key={index}>
                {horario(period.vigente_de)} →{' '}
                {period.vigente_ate === null
                  ? 'Em aberto'
                  : horario(period.vigente_ate)}{' '}
                ·{' '}
                {period.origem === 'LEGADO'
                  ? 'Registro legado'
                  : 'Atribuição explícita'}
              </li>
            ))}
          </ol>
        ) : (
          <p>
            Esta conta ainda não tem períodos de uso. Ative-a quando estiver
            disponível ou consulte outra conta.
          </p>
        )}
      </details>
      <div className="acoes">
        {titular !== null && account.acoes_validas.includes('ATIVAR') && (
          <button
            type="button"
            disabled={
              write.blocked ||
              !write.can(
                'POST /api/v1/titulares/{titular_id}/contas/{conta_id}/ativar',
              )
            }
            onClick={() =>
              void write.run(
                'POST /api/v1/titulares/{titular_id}/contas/{conta_id}/ativar',
                async (signal) => {
                  const { data } = await client.POST(
                    '/api/v1/titulares/{titular_id}/contas/{conta_id}/ativar',
                    { params, signal },
                  );
                  contaValidada(
                    validar(
                      data,
                      'POST /api/v1/titulares/{titular_id}/contas/{conta_id}/ativar',
                    ),
                  );
                },
                'Conta ativada. O início do período está registrado no histórico.',
              )
            }
          >
            Ativar conta
          </button>
        )}
        {editable && (
          <button
            type="button"
            disabled={write.blocked}
            onClick={() => {
              setNickname(account.apelido);
              setState(undefined);
              setEdit(!edit);
            }}
          >
            Editar conta
          </button>
        )}
      </div>
      {(account.acoes_validas.includes('TROCAR_DE') ||
        account.acoes_validas.includes('TROCAR_PARA')) && (
        <p>
          A troca entre contas será disponibilizada com a prévia de troca. Esta
          conta e seu histórico continuam disponíveis aqui.
        </p>
      )}
      {edit && editable && (
        <form
          aria-label={'Editar ' + account.apelido}
          onSubmit={(event) => {
            event.preventDefault();
            if (!nickname.trim()) return;
            void write
              .run(
                'PATCH /api/v1/titulares/{titular_id}/contas/{conta_id}',
                async (signal) => {
                  const { data } = await client.PATCH(
                    '/api/v1/titulares/{titular_id}/contas/{conta_id}',
                    {
                      params,
                      signal,
                      body: {
                        apelido: nickname.trim(),
                        ...(state ? { estado: state } : {}),
                      },
                    },
                  );
                  contaValidada(
                    validar(
                      data,
                      'PATCH /api/v1/titulares/{titular_id}/contas/{conta_id}',
                    ),
                  );
                },
                'Conta atualizada.',
                [
                  {
                    scope: 'body',
                    field: 'apelido',
                    id: 'contas-apelido-' + account.conta_casa_id,
                    label: 'Apelido da conta',
                  },
                ],
              )
              .then((success) => {
                if (success) setEdit(false);
              });
          }}
        >
          <label>
            Apelido da conta
            <input
              id={'contas-apelido-' + account.conta_casa_id}
              value={nickname}
              maxLength={160}
              required
              onChange={(e) => setNickname(e.target.value)}
              disabled={write.blocked}
            />
          </label>
          <EscolhaFiltro
            label="Estado da conta"
            value={state ?? undefined}
            resetLabel="Manter estado atual"
            selectedLabel={state ? ESTADOS[state] : 'Manter estado atual'}
            options={(['DISPONIVEL', 'LIMITADA', 'ENCERRADA'] as const).map(
              (value) => ({ value, label: ESTADOS[value] }),
            )}
            disabled={write.blocked}
            onChange={(value) => setState(value as typeof state)}
          />
          {state === 'ENCERRADA' && (
            <p>
              Encerrar esta conta mantém seu histórico e impede novas ativações.
            </p>
          )}
          <button disabled={write.blocked || !nickname.trim()}>
            {state === 'ENCERRADA'
              ? 'Confirmar encerramento e salvar'
              : 'Salvar conta'}
          </button>
          <button
            type="button"
            onClick={() => setEdit(false)}
            disabled={write.busy}
          >
            Cancelar
          </button>
        </form>
      )}
    </article>
  );
}

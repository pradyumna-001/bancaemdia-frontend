import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { getApiClient, type createApiClient } from '../../../api/client';
import { ApiError } from '../../../api/error';
import { useAuth } from '../../../auth/ProvedorAuth';
import { ErroApi } from '../../../components/ErroApi';
import { EscolhaFiltro } from '../../../components/filtros/EscolhaFiltro';
import { DataFiltro } from '../../../components/filtros/DataFiltro';
import { SITE_READ_CONTRACT } from '../../../api/site-read.generated';
import { lerFiltros } from '../../../lib/params';
import { useCatalogos } from '../../apostas/catalogos';
import { useLeituraPainel } from '../../painel/useLeituraPainel';
import { uuidValido } from '../../revisao/protocol';
import {
  ESTADOS,
  identificador,
  validar,
  contaValidada,
  horario,
} from '../protocol';
import { useTroca } from './useTroca';
import { instante, type Pedido, type Recibo } from './protocol';
import '../contas.css';
import './troca.css';
import '../../../components/filtros/filtros.css';

export function TrocaContaPage({
  client = getApiClient(),
}: {
  client?: ReturnType<typeof createApiClient>;
}) {
  const auth = useAuth()!;
  return <Conteudo key={auth.state.privateEpoch} client={client} />;
}
function Conteudo({ client }: { client: ReturnType<typeof createApiClient> }) {
  const auth = useAuth()!;
  const [params, setParams] = useSearchParams();
  const location = useLocation();
  const filters = lerFiltros(params);
  const house = identificador(filters.valores.casa);
  const reading = useLeituraPainel();
  const swap = useTroca(client);
  const s = swap.state;
  const [origin, setOrigin] = useState<string>();
  const [target, setTarget] = useState<string>();
  const [day, setDay] = useState<string>();
  const [time, setTime] = useState('');
  const [offset, setOffset] = useState('-03:00');
  const [end, setEnd] = useState<Pedido['estado_origem']>();
  const [formError, setFormError] = useState('');
  const [recovery, setRecovery] = useState('');
  const [copied, setCopied] = useState('');
  const confirm = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const cancel = useRef<HTMLButtonElement>(null);
  const success = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (s.receipt) success.current?.focus();
  }, [s.receipt]);
  const catalogs = useCatalogos(
    SITE_READ_CONTRACT,
    client,
    filters,
    ['casa'],
    true,
  );
  const houses = catalogs.casa;
  const matrix = useQuery({
    queryKey: ['contas', auth.state.privateEpoch, 'troca-matriz', house],
    enabled: !!house,
    retryOnMount: false,
    queryFn: ({ signal }) =>
      reading.read(async () => {
        const { data } = await client.GET(
          '/api/v1/titulares/casas/{casa_id}/matriz',
          { params: { path: { casa_id: house! } }, signal },
        );
        const value = validar(data, '/api/v1/titulares/casas/{casa_id}/matriz');
        if (
          value.casa_id !== house ||
          value.contas.some((a) => a.casa_id !== house)
        )
          throw new ApiError('invalid_response');
        value.contas.forEach(contaValidada);
        return value;
      }),
  });
  const accounts = matrix.data?.contas ?? [];
  const from = accounts.filter((a) => a.acoes_validas.includes('TROCAR_DE'));
  const to = accounts.filter(
    (a) =>
      a.acoes_validas.includes('TROCAR_PARA') &&
      String(a.conta_casa_id) !== origin,
  );
  const accountName = (id: number) => {
    const a = accounts.find((a) => a.conta_casa_id === id);
    return a
      ? `${a.apelido} · ${a.titular_nome ?? 'Sem titular'}`
      : `Conta ${id}`;
  };
  const options = (items: typeof accounts) =>
    items.map((a) => ({
      value: String(a.conta_casa_id),
      label: accountName(a.conta_casa_id),
    }));
  const blocked = swap.busy || swap.waiting;
  const destination = location.pathname + location.search;
  function evidence(receipt: Recibo) {
    return (
      <>
        <dl className="troca-resumo">
          <div>
            <dt>Casa deste pedido</dt>
            <dd>
              {matrix.data?.casa_id === receipt.casa_id
                ? matrix.data.casa_nome
                : `Casa ${receipt.casa_id}`}
            </dd>
          </div>
          <div>
            <dt>De</dt>
            <dd>{accountName(receipt.conta_origem_id)}</dd>
          </div>
          <div>
            <dt>Para</dt>
            <dd>{accountName(receipt.conta_destino_id)}</dd>
          </div>
          <div>
            <dt>A partir de</dt>
            <dd className="numero">{horario(receipt.efetiva_em)}</dd>
          </div>
          <div>
            <dt>A conta anterior ficará</dt>
            <dd>{ESTADOS[receipt.estado_origem]}</dd>
          </div>
        </dl>
        <p>
          Apostas existentes mantêm sua atribuição, inclusive as abertas antes
          da troca. Nenhum valor é alterado.
        </p>
        {receipt.apostas_afetadas_ids.length ? (
          <details open className="troca-impacto">
            <summary>
              {receipt.apostas_afetadas_ids.length} apostas para conferir a
              atribuição
            </summary>
            <p>
              Estas apostas ocorreram a partir deste instante e podem precisar
              de revisão individual. A troca não as transfere.
            </p>
            <div
              className="troca-itens"
              role="region"
              aria-label="Lista de apostas indicadas para revisão"
              // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- Região rolável precisa receber foco para leitura por teclado, como a tabela das evoluções.
              tabIndex={0}
            >
              <ul aria-label="Apostas para conferir">
                {receipt.apostas_afetadas_ids.map((id) => (
                  <li key={id} className="numero">
                    Aposta {id}
                  </li>
                ))}
              </ul>
            </div>
            <Link to={'/' + location.search}>
              Consultar Apostas com os filtros preservados
            </Link>
          </details>
        ) : (
          <p>Nenhuma aposta existente indicada para revisão.</p>
        )}
      </>
    );
  }
  const retrySame =
    s.uncertain && s.consulted && s.body && s.confirmed && !s.receipt;
  return (
    <main className="pagina contas-pagina troca-pagina">
      <Link to={'/contas' + location.search}>Contas e titulares</Link>
      <h1>Trocar conta em uso</h1>
      <p className="troca-intro">
        Registre quando uma conta passa a ser usada no lugar de outra,
        preservando o histórico.
      </p>
      {!s.id && (
        <p>
          Já iniciou uma troca e perdeu a resposta? Use seu código em “Consultar
          uma troca anterior” antes de preparar outro pedido.
        </p>
      )}
      {filters.invalidos.length > 0 && (
        <p role="status">
          Parâmetros inválidos foram ignorados nesta consulta.
        </p>
      )}
      {!swap.canPreview && (
        <p role="status">
          Você pode consultar uma troca anterior. Para criar ou confirmar uma
          troca, sua assinatura precisa permitir alterações.
        </p>
      )}
      <section aria-labelledby="troca-casa">
        <h2 id="troca-casa">1. Escolha a casa</h2>
        <EscolhaFiltro
          label="Casa da troca"
          value={filters.valores.casa}
          options={houses?.options ?? []}
          selectedLabel={houses?.selecionada?.label}
          disabled={!!s.id || blocked || reading.waiting}
          onChange={(value) => {
            const next = new URLSearchParams(params);
            if (value) next.set('casa', value);
            else next.delete('casa');
            setOrigin(undefined);
            setTarget(undefined);
            setParams(next);
          }}
          busca={
            houses?.buscar
              ? {
                  consulta: houses.consulta ?? '',
                  buscar: houses.buscar,
                  atualizando: houses.atualizando,
                }
              : undefined
          }
        >
          {houses?.fase === 'carregando' && (
            <p role="status">Consultando casas…</p>
          )}
          {houses?.erro && <p role="alert">{houses.erro}</p>}
          {houses?.fase === 'pronto' && !houses.options.length && (
            <p>Nenhuma casa nesta busca. Busque outro nome.</p>
          )}
          {houses?.anterior && (
            <button type="button" onClick={houses.anterior}>
              Opções anteriores
            </button>
          )}
          {houses?.proxima && (
            <button type="button" onClick={houses.proxima}>
              Mais casas
            </button>
          )}
          {houses?.fase === 'erro' && houses.tentar && (
            <button type="button" onClick={houses.tentar}>
              Tentar consultar casas
            </button>
          )}
        </EscolhaFiltro>
        <p>
          Os demais filtros permanecem no endereço. A elegibilidade da troca
          considera todas as contas desta casa.
        </p>
        {!house && <p>Escolha uma casa para consultar as contas elegíveis.</p>}
        {house && matrix.isPending && (
          <p role="status">Consultando contas elegíveis…</p>
        )}
        {matrix.isError && (
          <ErroApi
            error={matrix.error}
            intent="leitura"
            contexto="Contas elegíveis"
            destination={destination}
            actions={{ tentar: () => void matrix.refetch() }}
          />
        )}
      </section>
      {!s.id && matrix.data && (
        <section aria-labelledby="troca-dados">
          <h2 id="troca-dados">2. Prepare a troca</h2>
          {(!from.length || !to.length) && (
            <p>
              Esta casa precisa de uma conta em uso e outra elegível para
              receber a troca.{' '}
              <Link to={'/contas' + location.search}>
                Consultar ou cadastrar contas
              </Link>
              .
            </p>
          )}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setFormError('');
              try {
                const a = identificador(origin);
                const b = identificador(target);
                if (
                  !house ||
                  !a ||
                  !b ||
                  !end ||
                  !from.some((v) => v.conta_casa_id === a) ||
                  !to.some((v) => v.conta_casa_id === b)
                )
                  throw new Error(
                    'Escolha as duas contas elegíveis e o estado final da conta anterior.',
                  );
                void swap.preview({
                  casa_id: house,
                  conta_origem_id: a,
                  conta_destino_id: b,
                  efetiva_em: instante(day ?? '', time, offset),
                  estado_origem: end,
                });
              } catch (error) {
                setFormError(
                  error instanceof Error
                    ? error.message
                    : 'Confira os campos da troca.',
                );
              }
            }}
          >
            <fieldset
              disabled={blocked || !swap.canPreview}
              className="troca-campos"
            >
              <legend>Contas e início do novo uso</legend>
              <EscolhaFiltro
                label="Conta anterior"
                value={origin}
                options={options(from)}
                resetLabel="Escolher conta anterior"
                selectedLabel={origin ? undefined : 'Escolher conta anterior'}
                onChange={(v) => {
                  setOrigin(v);
                  setTarget(undefined);
                }}
              />
              <EscolhaFiltro
                label="Nova conta"
                value={target}
                options={options(to)}
                resetLabel="Escolher nova conta"
                selectedLabel={target ? undefined : 'Escolher nova conta'}
                onChange={setTarget}
              />
              <DataFiltro
                label="Data da troca"
                value={day}
                onChange={setDay}
                help="Hoje e Ontem seguem o calendário de São Paulo. Informe a hora e o deslocamento UTC no formulário da troca."
                emptyLabel="Escolher data"
                clearLabel="Limpar data"
              />
              <label>
                Hora da troca
                <input
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  required
                  placeholder="14:30"
                  maxLength={8}
                  aria-describedby="troca-fuso-ajuda"
                />
              </label>
              <EscolhaFiltro
                label="Fuso da hora informada"
                value={offset}
                options={[
                  { value: '-03:00', label: 'UTC −03:00 (Brasília)' },
                  { value: '+00:00', label: 'UTC +00:00' },
                  { value: '-02:00', label: 'UTC −02:00' },
                  { value: '-04:00', label: 'UTC −04:00' },
                  { value: '-05:00', label: 'UTC −05:00' },
                ]}
                onChange={(v) => setOffset(v ?? '-03:00')}
                resetLabel="Restaurar fuso de Brasília"
              />
              <p id="troca-fuso-ajuda">
                Informe a hora no deslocamento UTC escolhido. A prévia mostra o
                instante convertido para São Paulo.
              </p>
              <EscolhaFiltro
                label="Estado final da conta anterior"
                value={end}
                options={(['DISPONIVEL', 'LIMITADA', 'ENCERRADA'] as const).map(
                  (v) => ({ value: v, label: ESTADOS[v] }),
                )}
                resetLabel="Escolher estado final"
                selectedLabel={end ? undefined : 'Escolher estado final'}
                onChange={(v) => setEnd(v as typeof end)}
              />
              {end === 'ENCERRADA' && (
                <p>
                  Encerrar preserva o histórico e impede novas ativações desta
                  conta.
                </p>
              )}
              <button disabled={!day || !origin || !target || !end || !time}>
                Consultar prévia da troca
              </button>
            </fieldset>
          </form>
          {formError && <p role="alert">{formError}</p>}
        </section>
      )}
      {swap.busy && <p role="status">Consultando o resultado da troca…</p>}
      {swap.waiting && (
        <p role="status">
          O serviço pediu uma pausa antes de novas ações. Os botões serão
          liberados ao terminar; o pedido não será reenviado automaticamente.
        </p>
      )}
      {swap.error !== undefined && (
        <ErroApi
          error={swap.error}
          contexto="Troca de conta"
          intent="gravacao"
          conflict={
            swap.error instanceof ApiError &&
            swap.error.code === 'swap_preview_stale'
              ? 'previa'
              : undefined
          }
          destination={destination}
        />
      )}
      {s.renewable && (
        <p role="alert">
          A prévia não pode ser confirmada. Prepare uma nova prévia e confira as
          consequências novamente.
        </p>
      )}
      {s.uncertain && !s.receipt && (
        <p role="alert">
          O resultado deste pedido ainda não foi confirmado. Consulte a mesma
          intenção antes de qualquer reenvio. A consulta sem recibo não comprova
          que a troca foi desfeita.
        </p>
      )}
      {s.preview && !s.receipt && (
        <section aria-labelledby="troca-previa">
          <h2 id="troca-previa">3. Confira a prévia</h2>
          {evidence(s.preview)}
          {s.body &&
            !s.renewable &&
            (!s.uncertain || retrySame || (!s.confirmed && s.consulted)) && (
              <button
                ref={trigger}
                className="troca-primaria"
                type="button"
                disabled={blocked || !swap.canApply}
                onClick={() => {
                  confirm.current!.showModal();
                  cancel.current?.focus();
                }}
              >
                {retrySame
                  ? 'Reenviar a mesma troca'
                  : 'Continuar para confirmação'}
              </button>
            )}
          {!s.confirmed && !s.uncertain && (
            <button type="button" disabled={blocked} onClick={swap.reset}>
              Alterar dados da troca
            </button>
          )}
        </section>
      )}
      {s.receipt && (
        <section aria-labelledby="troca-concluida">
          <h2 ref={success} id="troca-concluida" tabIndex={-1}>
            Troca confirmada
          </h2>
          <p role="status">
            A nova vigência foi registrada. O histórico das apostas foi
            preservado.
          </p>
          {evidence(s.receipt)}
        </section>
      )}
      {(s.receipt || s.renewable) && (
        <button
          type="button"
          disabled={blocked}
          onClick={() => {
            if (s.receipt) {
              setOrigin(undefined);
              setTarget(undefined);
              setEnd(undefined);
              setDay(undefined);
              setTime('');
            }
            swap.reset();
          }}
        >
          Preparar outra troca
        </button>
      )}
      {s.id && (
        <section aria-labelledby="troca-consulta">
          <h2 id="troca-consulta">Consultar este pedido</h2>
          <p>
            Use a consulta se a conexão cair ou o resultado não aparecer. Ela
            verifica esta intenção, inclusive com acesso de leitura.
          </p>
          <button
            type="button"
            disabled={blocked}
            onClick={() => void swap.consult()}
          >
            Consultar resultado da mesma intenção
          </button>
          {!s.body && !s.receipt && (
            <p>
              Os dados do pedido saíram da memória. Apenas a consulta está
              disponível; a tela não reconstruirá ou reenviará a troca.
            </p>
          )}
          {s.consulted && !s.receipt && (
            <p role="status">
              Nenhum recibo de aplicação foi confirmado nesta consulta. Isso não
              autoriza uma nova identidade para substituir o pedido.
            </p>
          )}
          {s.uncertain &&
            s.consulted &&
            s.body &&
            !s.confirmed &&
            !s.receipt && (
              <button
                type="button"
                disabled={blocked || !swap.canPreview}
                onClick={() => void swap.resendPreview()}
              >
                Reenviar a mesma prévia
              </button>
            )}
          <details>
            <summary>Código de consulta</summary>
            <p className="numero">{s.id}</p>
            <button
              type="button"
              onClick={() => {
                void (
                  navigator.clipboard
                    ? navigator.clipboard.writeText(s.id!)
                    : Promise.reject()
                ).then(
                  () => setCopied('Código copiado.'),
                  () =>
                    setCopied(
                      'Não foi possível copiar. Selecione o código para guardá-lo.',
                    ),
                );
              }}
            >
              Copiar código de consulta
            </button>
            <p role="status">{copied}</p>
            <p>
              Guarde este código antes de recarregar. Os dados do pedido ficam
              somente na memória; o código permite consultar o resultado depois.
            </p>
          </details>
        </section>
      )}
      {!s.id && (
        <details>
          <summary>Consultar uma troca anterior</summary>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (uuidValido(recovery)) swap.recover(recovery);
            }}
          >
            <label>
              Código de consulta anterior
              <input
                value={recovery}
                maxLength={36}
                onChange={(e) => setRecovery(e.target.value)}
              />
            </label>
            <button disabled={!uuidValido(recovery) || blocked}>
              Usar código para consulta
            </button>
          </form>
        </details>
      )}
      <dialog
        ref={confirm}
        aria-labelledby="troca-confirmar"
        onClose={() => trigger.current?.focus()}
      >
        <h2 id="troca-confirmar">Confirmar esta troca?</h2>
        {s.preview && evidence(s.preview)}
        <div className="acoes">
          <button
            ref={cancel}
            type="button"
            onClick={() => confirm.current!.close()}
          >
            Agora não
          </button>
          <button
            type="button"
            disabled={blocked || !swap.canApply}
            onClick={() => {
              confirm.current!.close();
              void swap.apply();
            }}
          >
            Confirmar troca
          </button>
        </div>
      </dialog>
    </main>
  );
}

import { useRef, useState, type FormEvent } from 'react';
import type { createApiClient } from '../../api/client';
import { ApiError } from '../../api/error';
import { ErroApi } from '../../components/ErroApi';
import { centavosDaEntrada, decimalEditavel, moeda } from '../../lib/format';
import {
  CAPITAL_MAXIMO_CENTAVOS,
  NOME_MAXIMO,
  instante,
  type Banca,
  type BancaAlteracao,
  type Pedido,
} from './bancas';
import { useBancas, useListaBancas } from './useBancas';

export type SaldoBanca = {
  id: number;
  saldo_total_centavos: number | null;
  motivo_saldo_indisponivel?: string | null;
};

const RECUSAS: Record<string, string> = {
  nome_em_uso:
    'Já existe uma banca com este nome, inclusive entre as arquivadas. Nada foi gravado.',
  banca_arquivada: 'Esta banca já está arquivada. Nada foi alterado.',
  banca_com_contas:
    'A banca ainda tem contas vinculadas. Desvincule as contas e tente arquivar de novo.',
  banca_nao_encontrada: 'Esta banca não foi encontrada nesta conta.',
};

const capitalTexto = (value: number | null) =>
  value === null ? 'Não informado' : moeda(value);

type Rascunho = { nome: string; capital: string };

// Empty capital means "not informed" (null), never zero.
function lerRascunho(
  form: Rascunho,
): { nome: string; capital: number | null } | string {
  const nome = form.nome.trim();
  if (!nome || nome.length > NOME_MAXIMO)
    return `Informe um nome de 1 a ${NOME_MAXIMO} caracteres.`;
  if (!form.capital.trim()) return { nome, capital: null };
  try {
    const capital = centavosDaEntrada(form.capital);
    if (capital > CAPITAL_MAXIMO_CENTAVOS) throw new Error('limite');
    return { nome, capital };
  } catch {
    return `Informe o capital em reais, como 1500 ou 1500,50, até ${moeda(CAPITAL_MAXIMO_CENTAVOS)}.`;
  }
}

function FormBanca({
  prefixo,
  inicial,
  bloqueado,
  rotulo,
  onEnviar,
  onCancelar,
}: {
  prefixo: string;
  inicial?: Banca;
  bloqueado: boolean;
  rotulo: string;
  onEnviar: (value: { nome: string; capital: number | null }) => void;
  onCancelar: () => void;
}) {
  const [form, setForm] = useState<Rascunho>({
    nome: inicial?.nome ?? '',
    capital:
      inicial?.saldo_inicial_centavos == null
        ? ''
        : decimalEditavel(String(inicial.saldo_inicial_centavos), -2),
  });
  const [erro, setErro] = useState('');
  function submit(event: FormEvent) {
    event.preventDefault();
    const lido = lerRascunho(form);
    if (typeof lido === 'string') return setErro(lido);
    setErro('');
    onEnviar(lido);
  }
  return (
    <form className="banca-form" onSubmit={submit}>
      <label htmlFor={`${prefixo}-nome`}>Nome da banca</label>
      <input
        id={`${prefixo}-nome`}
        value={form.nome}
        maxLength={NOME_MAXIMO}
        autoComplete="off"
        disabled={bloqueado}
        onChange={(event) => setForm({ ...form, nome: event.target.value })}
      />
      <label htmlFor={`${prefixo}-capital`}>Capital inicial (R$)</label>
      <input
        id={`${prefixo}-capital`}
        inputMode="decimal"
        value={form.capital}
        aria-describedby={`${prefixo}-capital-ajuda`}
        disabled={bloqueado}
        onChange={(event) => setForm({ ...form, capital: event.target.value })}
      />
      <p id={`${prefixo}-capital-ajuda`} className="legenda">
        Opcional. Em branco, o capital fica não informado; zero é zero.
      </p>
      {erro && <p role="alert">{erro}</p>}
      <div className="banca-acoes">
        <button type="submit" disabled={bloqueado}>
          {rotulo}
        </button>
        <button type="button" onClick={onCancelar}>
          Cancelar
        </button>
      </div>
    </form>
  );
}

export function BancasCaixa({
  client,
  saldos,
}: {
  client: ReturnType<typeof createApiClient>;
  saldos?: readonly SaldoBanca[];
}) {
  const lista = useListaBancas(client);
  const escrita = useBancas(client);
  const [escolhido, setAberto] = useState<'nova' | number>();
  const [arquivar, setArquivar] = useState<Banca>();
  const dialog = useRef<HTMLDialogElement>(null);
  const cancelar = useRef<HTMLButtonElement>(null);
  const retorno = useRef<string>();
  const { tentativa, fase, resultado } = escrita;
  const bloqueado = escrita.ocupado;
  // The form that produced a confirmed result closes; a new gesture clears
  // the result and opens it again.
  const aberto =
    resultado &&
    escolhido === (resultado.operacao === 'CRIAR' ? 'nova' : resultado.banca.id)
      ? undefined
      : escolhido;
  const ativas = lista.data?.filter((b) => b.estado === 'ativa') ?? [];
  const arquivadas = lista.data?.filter((b) => b.estado === 'arquivada') ?? [];
  const saldoDe = (id: number) => saldos?.find((s) => s.id === id);
  const prefixo = aberto === 'nova' ? 'banca-nova' : `banca-${aberto}`;
  const recusa =
    escrita.error instanceof ApiError && escrita.error.code
      ? RECUSAS[escrita.error.code]
      : undefined;

  function enviar(pedido: Pedido) {
    escrita.enviar(pedido);
  }
  function editar(
    banca: Banca,
    value: { nome: string; capital: number | null },
  ) {
    const body: BancaAlteracao = {};
    if (value.nome !== banca.nome) body.nome = value.nome;
    if (value.capital !== banca.saldo_inicial_centavos)
      body.saldo_inicial_centavos = value.capital;
    if (!Object.keys(body).length) return setAberto(undefined);
    enviar({ operacao: 'ALTERAR', bancaId: banca.id, body });
  }
  function abrirArquivar(banca: Banca) {
    retorno.current = `banca-arquivar-${banca.id}`;
    setArquivar(banca);
    dialog.current?.showModal();
    cancelar.current?.focus();
  }

  return (
    <section aria-labelledby="bancas-titulo" className="caixa-bancas">
      <h2 id="bancas-titulo">Bancas</h2>
      <p className="legenda">
        Uma banca agrupa contas. O capital inicial é informado por você; o saldo
        vem das contas vinculadas. Arquivar não apaga movimentos nem apostas.
      </p>
      {lista.isPending && <p role="status">Consultando bancas…</p>}
      {lista.error && (
        <ErroApi
          error={lista.error}
          intent="leitura"
          actions={{ tentar: () => void lista.refetch() }}
        />
      )}

      {resultado && (
        <p role="status">
          {resultado.operacao === 'CRIAR'
            ? `Banca ${resultado.banca.nome} criada.`
            : resultado.operacao === 'ALTERAR'
              ? `Alterações da banca ${resultado.banca.nome} salvas.`
              : `Banca ${resultado.banca.nome} arquivada. Ela continua nas leituras com seu nome.`}
        </p>
      )}
      {!tentativa &&
        escrita.error !== undefined &&
        (recusa ? (
          <p role="alert">{recusa}</p>
        ) : (
          <ErroApi
            error={escrita.error}
            intent="gravacao"
            fields={
              aberto === undefined
                ? []
                : [
                    {
                      scope: 'body',
                      field: 'nome',
                      label: 'Nome da banca',
                      id: `${prefixo}-nome`,
                    },
                    {
                      scope: 'body',
                      field: 'saldo_inicial_centavos',
                      label: 'Capital inicial (R$)',
                      id: `${prefixo}-capital`,
                    },
                  ]
            }
          />
        ))}
      {tentativa && fase === 'sending' && (
        <p role="status">Enviando a alteração da banca…</p>
      )}
      {tentativa && fase === 'uncertain' && (
        <div role="status" className="banca-incerta">
          <p>
            Não foi possível confirmar se a alteração da banca foi gravada.
            Consulte o resultado antes de qualquer nova tentativa.
          </p>
          <button
            type="button"
            disabled={escrita.busy || escrita.waiting}
            onClick={() => void escrita.consultar()}
          >
            Consultar resultado
          </button>
        </div>
      )}
      {tentativa && fase === 'notFound' && (
        <div role="status" className="banca-incerta">
          <p>
            Não encontramos registro deste pedido. Isso não prova que nada foi
            feito.{' '}
            {escrita.podeReenviar
              ? 'Reenviar usa o mesmo pedido: se ele já tiver sido gravado, o serviço devolve o resultado original.'
              : 'O pedido original não está mais nesta página; descarte-o e faça de novo, se ainda quiser.'}
          </p>
          {escrita.podeReenviar && (
            <button
              type="button"
              disabled={
                escrita.busy ||
                escrita.waiting ||
                !escrita.pode(tentativa.pedido!.operacao)
              }
              onClick={escrita.reenviar}
            >
              Reenviar o mesmo pedido
            </button>
          )}
          <button
            type="button"
            disabled={escrita.busy}
            onClick={escrita.descartar}
          >
            Descartar este pedido
          </button>
        </div>
      )}

      {lista.data && !ativas.length && (
        <p>Nenhuma banca ativa. Crie uma para agrupar contas.</p>
      )}
      <ul className="caixa-bancas-lista">
        {ativas.map((banca) => {
          const saldo = saldoDe(banca.id);
          return (
            <li key={banca.id}>
              <article aria-labelledby={`banca-${banca.id}-titulo`}>
                <h3 id={`banca-${banca.id}-titulo`}>{banca.nome}</h3>
                <dl>
                  <div>
                    <dt>Capital inicial</dt>
                    <dd className="numero">
                      {capitalTexto(banca.saldo_inicial_centavos)}
                    </dd>
                  </div>
                  <div>
                    <dt>Saldo das contas</dt>
                    <dd className="numero">
                      {saldo?.saldo_total_centavos == null ||
                      saldo.motivo_saldo_indisponivel
                        ? 'Saldo indisponível'
                        : moeda(saldo.saldo_total_centavos)}
                    </dd>
                  </div>
                  <div>
                    <dt>Contas</dt>
                    <dd>
                      {banca.contas.length
                        ? banca.contas.map((c) => c.apelido).join(', ')
                        : 'Nenhuma conta vinculada'}
                    </dd>
                  </div>
                </dl>
                {aberto === banca.id ? (
                  <FormBanca
                    prefixo={`banca-${banca.id}`}
                    inicial={banca}
                    bloqueado={bloqueado || !escrita.pode('ALTERAR')}
                    rotulo="Salvar alterações"
                    onEnviar={(value) => editar(banca, value)}
                    onCancelar={() => setAberto(undefined)}
                  />
                ) : (
                  <div className="banca-acoes">
                    <button
                      type="button"
                      disabled={bloqueado || !escrita.pode('ALTERAR')}
                      onClick={() => {
                        escrita.limpar();
                        setAberto(banca.id);
                      }}
                    >
                      Editar {banca.nome}
                    </button>
                    <button
                      type="button"
                      id={`banca-arquivar-${banca.id}`}
                      disabled={
                        bloqueado ||
                        !escrita.pode('ARQUIVAR') ||
                        banca.contas.length > 0
                      }
                      onClick={() => abrirArquivar(banca)}
                    >
                      Arquivar {banca.nome}
                    </button>
                  </div>
                )}
                {banca.contas.length > 0 && (
                  <p className="legenda">
                    Para arquivar, desvincule as contas desta banca.
                  </p>
                )}
              </article>
            </li>
          );
        })}
      </ul>

      {aberto === 'nova' ? (
        <FormBanca
          prefixo="banca-nova"
          bloqueado={bloqueado || !escrita.pode('CRIAR')}
          rotulo="Criar banca"
          onEnviar={(value) =>
            enviar({
              operacao: 'CRIAR',
              body:
                value.capital === null
                  ? { nome: value.nome }
                  : { nome: value.nome, saldo_inicial_centavos: value.capital },
            })
          }
          onCancelar={() => setAberto(undefined)}
        />
      ) : (
        <button
          type="button"
          disabled={bloqueado || !escrita.pode('CRIAR') || !lista.data}
          onClick={() => {
            escrita.limpar();
            setAberto('nova');
          }}
        >
          Nova banca
        </button>
      )}
      {!escrita.pode('CRIAR') && (
        <p className="legenda">
          Com a conta em modo de leitura, as bancas podem ser consultadas, mas
          não criadas, alteradas ou arquivadas.
        </p>
      )}

      {arquivadas.length > 0 && (
        <details>
          <summary>Bancas arquivadas ({arquivadas.length})</summary>
          <ul className="caixa-bancas-lista">
            {arquivadas.map((banca) => (
              <li key={banca.id}>
                <strong>{banca.nome}</strong>{' '}
                <span className="legenda">
                  Arquivada em {instante(banca.arquivada_em!)} · capital inicial{' '}
                  <span className="numero">
                    {capitalTexto(banca.saldo_inicial_centavos)}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}

      <dialog
        ref={dialog}
        aria-labelledby="banca-arquivar-titulo"
        onClose={() => {
          setArquivar(undefined);
          if (retorno.current)
            document.getElementById(retorno.current)?.focus();
        }}
      >
        <h2 id="banca-arquivar-titulo">Arquivar esta banca?</h2>
        {arquivar && (
          <p>
            <strong>{arquivar.nome}</strong> sai das escolhas e de novos
            vínculos e continua nas leituras de saldo e análises com seu nome.
            Movimentos e apostas não mudam. Uma banca arquivada não volta a
            ficar ativa por aqui.
          </p>
        )}
        <div className="banca-acoes">
          <button
            type="button"
            onClick={() => {
              const alvo = arquivar;
              dialog.current?.close();
              if (alvo) enviar({ operacao: 'ARQUIVAR', bancaId: alvo.id });
            }}
          >
            Arquivar banca
          </button>
          <button
            ref={cancelar}
            type="button"
            onClick={() => dialog.current?.close()}
          >
            Agora não
          </button>
        </div>
      </dialog>
    </section>
  );
}

import { useQuery } from '@tanstack/react-query';
import { Link, useLocation } from 'react-router-dom';
import { getApiClient, type createApiClient } from '../../api/client';
import { useAuth } from '../../auth/ProvedorAuth';
import { ErroApi } from '../../components/ErroApi';
import { dataHora } from '../../lib/format';
import { novaApostaDestino } from '../../lib/params';
import { useAcesso } from '../acesso/ProvedorAcesso';
import { STATUS_LABELS } from '../assinatura/protocol';
import { useLeituraPainel } from '../painel/useLeituraPainel';
import { consultarInicio } from './consulta';
import './inicio.css';

export function InicioPage({
  client = getApiClient(),
}: {
  client?: ReturnType<typeof createApiClient>;
}) {
  const auth = useAuth();
  return <Conteudo key={auth?.state.privateEpoch} client={client} />;
}
function Conteudo({ client }: { client: ReturnType<typeof createApiClient> }) {
  const auth = useAuth();
  const access = useAcesso();
  const location = useLocation();
  const reading = useLeituraPainel();
  const query = useQuery({
    queryKey: ['inicio', auth?.state.person?.id, auth?.state.privateEpoch],
    enabled: auth?.state.phase === 'authenticated',
    staleTime: 0,
    retryOnMount: false,
    queryFn: ({ signal }) =>
      reading.read(() => consultarInicio(client, signal)),
  });
  // Do not turn a failed refresh or an unknown commercial state into completion.
  const presence = query.isError || query.isFetching ? undefined : query.data;
  const status = access?.status;
  const write = !!access?.can(
    'POST /api/v1/apostas-manuais/operacoes/{intencao_id}',
  );
  const link = (path: string, key?: string, value?: string) => {
    const search = new URLSearchParams(location.search);
    if (key) search.set(key, value!);
    return path + (search.size ? '?' + search : '');
  };
  const manual = novaApostaDestino(location.search);
  const task = !status
    ? undefined
    : !write
      ? {
          title: 'Confira seu acesso para enviar apostas',
          text: 'Você pode consultar e exportar seus registros enquanto confere a assinatura.',
          label: 'Conferir assinatura',
          to: link('/assinatura'),
        }
      : !presence
        ? undefined
        : presence.apostas
          ? {
              title: 'Suas apostas já estão no site',
              text: 'Continue de onde parou. Os registros incluem apostas apagadas; os filtros da lista podem mostrar outro recorte.',
              label: 'Ver minhas apostas',
              to: link('/'),
            }
          : !presence.contas
            ? {
                title: 'Prepare a conta da casa',
                text: 'Identifique em nome de quem está a conta e em qual casa você aposta. Assim, cada aposta pode ficar ligada à conta certa.',
                label: 'Organizar contas e titulares',
                to: link('/contas'),
              }
            : {
                title: 'Registre sua primeira aposta',
                text: 'Comece com uma aposta que você já fez ou escolha uma das formas de envio abaixo. Você não precisa fazer uma nova aposta para usar o site.',
                label: 'Registrar uma aposta',
                to: manual,
              };
  return (
    <main className="pagina inicio-pagina">
      <header className="inicio-abertura">
        <p className="legenda">Um passo de cada vez</p>
        <h1>Primeiro uso</h1>
        <p>
          Traga suas apostas para o bancaemdia. Você escolhe por onde começar e
          pode voltar a este guia quando quiser.
        </p>
        <Link to={link('/')}>Ir para Apostas</Link>
      </header>
      <section className="inicio-situacao" aria-labelledby="inicio-acesso">
        <h2 id="inicio-acesso">Seu acesso</h2>
        {auth?.state.phase === 'authenticated' && (
          <p>Acesso à conta confirmado. A assinatura é uma etapa separada.</p>
        )}
        {!status ? (
          <p role="status">
            {access?.checking
              ? 'Consultando assinatura…'
              : 'A situação da assinatura ainda não foi confirmada.'}
          </p>
        ) : (
          <>
            <p className="inicio-estado">
              {status.status === null
                ? 'Situação da assinatura não informada'
                : status.status === 'TRIALING' && !status.trial_confirmed
                  ? 'Período gratuito aguardando confirmação'
                  : STATUS_LABELS[status.status]}
            </p>
            {status.status === 'AWAITING_CARD' && (
              <p>
                Criar a conta não inicia o período gratuito. A confirmação do
                cartão acontece na área de assinatura.
              </p>
            )}
            {status.status === 'TRIALING' &&
              status.trial_confirmed &&
              status.trial_ends_at && (
                <p>
                  Período gratuito confirmado até{' '}
                  <time dateTime={status.trial_ends_at}>
                    {dataHora(status.trial_ends_at, 'America/Sao_Paulo')}
                  </time>
                  .
                </p>
              )}
            {status.status === 'TRIALING' && !status.trial_confirmed && (
              <p>
                A confirmação do período gratuito ainda não foi informada.
                Confira os detalhes na assinatura.
              </p>
            )}
            <Link to={link('/assinatura')}>Ver detalhes da assinatura</Link>
          </>
        )}
      </section>
      <section className="inicio-proximo" aria-labelledby="inicio-proximo">
        <p className="legenda">Próximo passo</p>
        <h2 id="inicio-proximo">
          {task?.title ?? 'Vamos conferir por onde continuar'}
        </h2>
        {task && (
          <>
            <p>{task.text}</p>
            <Link className="inicio-principal" to={task.to}>
              {task.label}
            </Link>
          </>
        )}
        {query.isFetching && <p role="status">Consultando seus registros…</p>}
        {query.isError && (
          <ErroApi
            intent="leitura"
            error={query.error}
            contexto="Consultar os primeiros passos"
            destination={location.pathname + location.search}
            actions={{
              tentar:
                !reading.waiting && !query.isFetching
                  ? () => void query.refetch()
                  : undefined,
            }}
          />
        )}
        {!query.isPending && !query.isError && (
          <button
            type="button"
            disabled={reading.waiting || query.isFetching}
            onClick={() => void query.refetch()}
          >
            {query.isFetching
              ? 'Consultando registros…'
              : 'Conferir meus registros'}
          </button>
        )}
        <p className="legenda">
          Esta consulta considera todos os seus registros, inclusive apagados e
          contas inativas. Os filtros continuam no endereço para as próximas
          telas.
        </p>
      </section>
      <details className="inicio-contas">
        <summary>Entenda titular e conta da casa</summary>
        <dl>
          <div>
            <dt>Titular</dt>
            <dd>É a pessoa em cujo nome está a conta na casa de apostas.</dd>
          </div>
          <div>
            <dt>Conta da casa</dt>
            <dd>
              É a conta usada para apostar naquela casa. Pode ter um apelido
              para você reconhecê-la.
            </dd>
          </div>
        </dl>
        {presence && (
          <p>
            {!presence.titulares
              ? 'Você ainda não cadastrou titulares.'
              : 'Já há titulares cadastrados, inclusive possíveis arquivados.'}{' '}
            {!presence.contas
              ? 'Ainda não há contas da casa cadastradas.'
              : 'Já há contas cadastradas. Isso não significa que estejam em uso no dia de cada aposta.'}
          </p>
        )}
        <p>
          Cadastre somente o que precisar agora. A escolha da conta de uma
          aposta considera a data do jogo; a tela de envio mostra quando é
          preciso revisar a atribuição.
        </p>
        <Link to={link('/contas')}>
          {write
            ? 'Organizar contas e titulares'
            : 'Consultar contas e titulares'}
        </Link>
      </details>
      <section aria-labelledby="inicio-canais">
        <h2 id="inicio-canais">Como você quer trazer suas apostas?</h2>
        <p>Escolha a forma que combina com o que você já tem.</p>
        {!write && (
          <p>
            As opções de envio estarão disponíveis quando o serviço confirmar o
            acesso de escrita. Você pode ler as instruções agora.
          </p>
        )}
        <ul className="inicio-canais">
          {(
            [
              [
                'manual',
                'Uma aposta por vez',
                'Preencha os dados de um bilhete que você já fez.',
                manual,
              ],
              [
                'telegram',
                'Arquivo do Telegram',
                'Importe o histórico exportado de uma conversa.',
                link('/enviar', 'entrada', 'telegram'),
              ],
              [
                'planilha',
                'Planilha',
                'Envie o arquivo e confira a prévia antes de confirmar.',
                link('/enviar', 'entrada', 'planilha'),
              ],
              [
                'prints',
                'Prints dos bilhetes',
                'Envie uma ou várias imagens pelo site.',
                link('/enviar', 'entrada', 'prints'),
              ],
            ] as const
          ).map(([channel, title, text, to]) => (
            <li key={channel}>
              <h3>{title}</h3>
              <p>{text}</p>
              <Link to={write ? to : link('/tutorial', 'guia', channel)}>
                {write
                  ? channel === 'manual'
                    ? 'Abrir Nova aposta'
                    : 'Enviar ' +
                      (channel === 'telegram'
                        ? 'arquivo do Telegram'
                        : channel === 'planilha'
                          ? 'planilha'
                          : 'prints')
                  : 'Como usar: ' + title}
              </Link>
            </li>
          ))}
          <li>
            <h3>Bot do Telegram</h3>
            <p className="legenda">Esperando lançamento</p>
            <p>
              Você já pode preparar o vínculo. O endereço público do bot ainda
              não está disponível.
            </p>
            <Link to={link('/configuracoes/conexoes')}>
              Preparar conexão com Telegram
            </Link>
          </li>
          <li>
            <h3>Extensão</h3>
            <p className="legenda">Esperando lançamento</p>
            <p>
              Acompanhe a disponibilidade da instalação. Enquanto isso, use uma
              das opções pelo site.
            </p>
            <Link to={link('/extensao')}>Ver disponibilidade da extensão</Link>
          </li>
        </ul>
      </section>
      <footer className="inicio-retomar">
        <h2>Continue no seu ritmo</h2>
        <p>
          Não é preciso concluir tudo de uma vez. Este guia consulta a situação
          atual sempre que você voltar, para orientar por onde continuar.
        </p>
        <Link to={link('/configuracoes/privacidade')}>
          Consultar exportação dos meus registros
        </Link>
        <Link to={link('/tutorial')}>Abrir Tutorial</Link>
      </footer>
    </main>
  );
}

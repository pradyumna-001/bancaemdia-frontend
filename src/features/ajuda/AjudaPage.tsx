import { useEffect, useRef } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { Logo } from '../../components/Logo';
import { PreferenciaTema } from '../../components/PreferenciaTema';
import { novaApostaDestino } from '../../lib/params';
import './ajuda.css';

const assuntos = {
  telegram: ['Export do Telegram', 'Importar o histórico de uma conversa'],
  prints: ['Prints', 'Enviar imagens pelo site'],
  planilha: ['Planilha', 'Conferir antes de importar'],
  manual: ['Nova aposta', 'Registrar uma aposta por vez'],
  bot: ['Bot do Telegram', 'Enviar uma foto na conversa privada'],
  excel: ['Excel do Painel', 'Baixar seus resultados'],
} as const;
type Assunto = keyof typeof assuntos;

// Illustration drawn for the guide; it is not a screenshot of an application.
function CaminhoDoArquivo() {
  return (
    <svg
      className="ajuda-ilustracao"
      viewBox="0 0 280 100"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M20 16h32l16 16v50H20V16Zm32 0v16h16M30 48h28M30 60h22" />
      <path d="M86 50h30m-8-8 8 8-8 8" />
      <rect x="134" y="26" width="36" height="48" rx="6" />
      <path d="M144 62h16m-8-12V34m-6 6 6-6 6 6M188 50h30m-8-8 8 8-8 8" />
      <path d="M236 24h28v52h-28V24Zm5 13 4 4 8-8m-12 22 4 4 8-8M242 66h16" />
    </svg>
  );
}

export function AjudaPage({ extensao = false }: { extensao?: boolean }) {
  const location = useLocation();
  const [params] = useSearchParams();
  const conteudo = useRef<HTMLElement>(null);
  const raw = params.get('guia');
  const assunto: Assunto =
    raw && Object.hasOwn(assuntos, raw) ? (raw as Assunto) : 'telegram';
  useEffect(() => {
    if (location.hash === '#passo-a-passo') conteudo.current?.focus();
  }, [assunto, extensao, location.hash]);
  const guia = (value: Assunto) => {
    const query = new URLSearchParams(location.search);
    query.set('guia', value);
    return `/tutorial?${query}#passo-a-passo`;
  };
  const destino = (path: string, entrada?: string) => {
    const query = new URLSearchParams(location.search);
    if (entrada) query.set('entrada', entrada);
    else query.delete('entrada');
    return `${path}?${query}`;
  };
  return (
    <div className="ajuda-publica">
      <a className="ajuda-pular" href="#ajuda-conteudo">
        Pular para o conteúdo
      </a>
      <header className="ajuda-cabecalho">
        <Link
          to={`/tutorial${location.search}`}
          aria-label="bancaemdia · Tutorial"
        >
          <Logo />
        </Link>
        <nav aria-label="Ajuda pública">
          <Link
            to={`/tutorial${location.search}`}
            aria-current={!extensao ? 'page' : undefined}
          >
            Tutorial
          </Link>
          <Link
            to={`/extensao${location.search}`}
            aria-current={extensao ? 'page' : undefined}
          >
            Extensão
          </Link>
          <Link to={`/login${location.search}`}>Entrar</Link>
        </nav>
      </header>
      <main id="ajuda-conteudo" className="ajuda-conteudo" tabIndex={-1}>
        <div className="ajuda-abertura">
          <div>
            <p className="legenda">Ajuda do bancaemdia</p>
            <h1>{extensao ? 'Extensão' : 'Tutorial'}</h1>
            <p>
              {extensao
                ? 'Acompanhe suas apostas a partir do histórico da casa.'
                : 'Suas apostas, do arquivo ao registro. Escolha o que você quer fazer.'}
            </p>
          </div>
          <CaminhoDoArquivo />
        </div>
        {extensao ? (
          <>
            <section
              className="ajuda-aviso"
              aria-labelledby="extensao-lancamento"
            >
              <p className="legenda">Esperando lançamento</p>
              <h2 id="extensao-lancamento">
                O download ainda não está disponível
              </h2>
              <p>
                A extensão ainda não tem uma versão publicada para instalação.
                Quando houver, esta página trará o arquivo da versão e seu
                código de verificação.
              </p>
              <p>
                Enquanto isso, escolha uma das formas de envio pelo site abaixo.
              </p>
            </section>
            <div className="ajuda-extensao-grade">
              <section className="ajuda-secao">
                <h2>Como a coleta funciona</h2>
                <p>
                  A extensão foi pensada para observar o histórico que você abre
                  na casa de apostas e encaminhar as informações ao bancaemdia.
                </p>
                <p>
                  Ela não faz apostas nem saques por você. O processamento e o
                  registro das apostas ficam com o serviço do bancaemdia.
                </p>
                <p>
                  O pareamento será feito por dispositivo, usando um código
                  temporário na área Coleta. As instruções de instalação e as
                  casas compatíveis acompanharão a versão publicada.
                </p>
              </section>
              <section className="ajuda-secao">
                <h2>Você pode enviar pelo site</h2>
                <p>
                  No celular ou no computador, envie os prints dos bilhetes,
                  importe uma planilha ou registre uma aposta por vez.
                </p>
                <div className="ajuda-alternativas">
                  <Link to={guia('prints')}>Como enviar Prints</Link>
                  <Link to={guia('planilha')}>Como importar uma planilha</Link>
                  <Link to={guia('manual')}>Como registrar uma aposta</Link>
                </div>
              </section>
            </div>
          </>
        ) : (
          <div className="ajuda-grade">
            <nav className="ajuda-assuntos" aria-label="Assuntos do tutorial">
              {Object.entries(assuntos).map(([key, [label, description]]) => (
                <Link
                  key={key}
                  to={guia(key as Assunto)}
                  aria-current={assunto === key ? 'page' : undefined}
                >
                  <span>{label}</span>
                  <small>{description}</small>
                </Link>
              ))}
              <Link to={`/extensao${location.search}`}>
                <span>Extensão</span>
                <small>Disponibilidade e coleta</small>
              </Link>
            </nav>
            <section
              ref={conteudo}
              id="passo-a-passo"
              className="ajuda-guia"
              aria-labelledby="guia-titulo"
              tabIndex={-1}
            >
              <p className="legenda">Passo a passo</p>
              <h2 id="guia-titulo">{assuntos[assunto][0]}</h2>
              {assunto === 'telegram' && (
                <>
                  <p>
                    Para importar o histórico de uma conversa, prepare o arquivo
                    no Telegram Desktop.
                  </p>
                  <ol className="ajuda-passos">
                    <li>
                      <strong>Exporte a conversa em JSON.</strong> Abra a
                      conversa no computador, use o menu de três pontos e
                      escolha exportar o histórico. Inclua as fotos dos
                      bilhetes.
                    </li>
                    <li>
                      <strong>Mantenha o arquivo e as fotos juntos.</strong>{' '}
                      Compacte result.json e a pasta das fotos em um ZIP,
                      preservando os nomes e as pastas. Um result.json sozinho
                      não contém as fotos dos bilhetes.
                    </li>
                    <li>
                      <strong>Abra Enviar e escolha Export do Telegram.</strong>{' '}
                      Selecione o ZIP preparado e envie. No celular, você pode
                      escolher o arquivo já preparado no computador.
                    </li>
                    <li>
                      <strong>Acompanhe o processamento.</strong> Um envio
                      aceito ainda está sendo processado. Confira o resultado e
                      as pendências indicadas; não reenvie só porque o arquivo
                      demorou.
                    </li>
                  </ol>
                  <p>
                    Se o resultado do envio ficar desconhecido, use a consulta
                    oferecida na tela. A tela informa quando não conseguiu
                    verificar o recebimento.
                  </p>
                  <div className="acoes">
                    <Link to={destino('/enviar')}>Abrir Enviar</Link>
                  </div>
                  <p className="ajuda-fonte">
                    <a
                      href="https://telegram.org/blog/export-and-more"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Instruções oficiais do Telegram (em outra aba)
                    </a>
                  </p>
                </>
              )}
              {assunto === 'prints' && (
                <>
                  <p>
                    Já tem as imagens dos bilhetes? Envie diretamente pelo site,
                    inclusive no celular.
                  </p>
                  <ol className="ajuda-passos">
                    <li>
                      <strong>Escolha Prints em Enviar.</strong> Adicione as
                      imagens dos bilhetes. Confira a prévia e os limites
                      apresentados na tela.
                    </li>
                    <li>
                      <strong>Envie e acompanhe cada imagem.</strong> O
                      recebimento do arquivo e o registro da aposta são etapas
                      diferentes. Algumas imagens podem precisar de revisão.
                    </li>
                    <li>
                      <strong>Resolva as pendências indicadas.</strong> Abra
                      Revisão quando solicitado. Após o registro, confira a
                      aposta em Apostas.
                    </li>
                  </ol>
                  <p>
                    Se a resposta se perder, consulte o envio existente. Uma
                    nova tentativa de processamento só aparece para os itens que
                    permitem essa ação; não reenvie os que já deram certo.
                  </p>
                  <div className="acoes">
                    <Link to={destino('/enviar', 'prints')}>Enviar Prints</Link>
                  </div>
                </>
              )}
              {assunto === 'planilha' && (
                <>
                  <p>
                    Importe um arquivo Excel com uma prévia antes de registrar
                    as apostas.
                  </p>
                  <ol className="ajuda-passos">
                    <li>
                      <strong>Escolha Planilha em Enviar.</strong> Selecione o
                      arquivo XLSX e informe a origem da importação conforme
                      solicitado.
                    </li>
                    <li>
                      <strong>Confira a prévia e o mapeamento.</strong> Escolha
                      a aba e associe as colunas. Alterar a aba ou o mapeamento
                      exige conferir uma nova prévia.
                    </li>
                    <li>
                      <strong>Confirme a importação.</strong> A prévia não
                      registra apostas. É só ao confirmar que as apostas são
                      registradas.
                    </li>
                    <li>
                      <strong>Confira o recibo.</strong> Se a resposta não
                      chegar, consulte a mesma importação antes de decidir. Uma
                      resposta de não encontrado não comprova que nada foi
                      gravado.
                    </li>
                  </ol>
                  <p>
                    A origem e a identificação das linhas ajudam a reconhecer
                    registros já importados. Preserve essas referências ao
                    atualizar a planilha.
                  </p>
                  <div className="acoes">
                    <Link to={destino('/enviar', 'planilha')}>
                      Importar planilha
                    </Link>
                  </div>
                </>
              )}
              {assunto === 'manual' && (
                <>
                  <p>Use Nova aposta para registrar um bilhete por vez.</p>
                  <ol className="ajuda-passos">
                    <li>
                      <strong>Preencha os dados do bilhete.</strong> Confira a
                      casa, a conta, a data e os valores antes de enviar.
                    </li>
                    <li>
                      <strong>Registre e confira o recibo.</strong> Aguarde a
                      confirmação. Se houver um aviso de revisão, siga o
                      encaminhamento da tela.
                    </li>
                    <li>
                      <strong>Consulte antes de tentar outra vez.</strong> Se a
                      resposta se perder, consulte o registro pela mesma
                      identificação. Após recarregar, o formulário anterior não
                      é reconstruído.
                    </li>
                  </ol>
                  <div className="acoes">
                    <Link to={novaApostaDestino(location.search)}>
                      Abrir Nova aposta
                    </Link>
                  </div>
                </>
              )}
              {assunto === 'bot' && (
                <>
                  <p>
                    O bot recebe uma foto em conversa privada. Esse caminho é
                    diferente de importar o histórico exportado do Telegram.
                  </p>
                  <ol className="ajuda-passos">
                    <li>
                      <strong>Conecte o Telegram.</strong> Quando o bot for
                      lançado, gere o código temporário em Configurações →
                      Conexões e envie o comando somente ao bot oficial.
                    </li>
                    <li>
                      <strong>Envie uma foto e confira o rascunho.</strong>{' '}
                      Corrija o que for necessário e confirme no Telegram. A
                      foto sozinha não confirma o registro.
                    </li>
                  </ol>
                  <p className="ajuda-aviso">
                    Esperando lançamento: o endereço oficial do bot ainda não
                    foi divulgado. O link ilustrativo na área Conexões é
                    fictício.
                  </p>
                  <div className="acoes">
                    <Link to={destino('/configuracoes/conexoes')}>
                      Abrir Conexões
                    </Link>
                  </div>
                  <p>
                    Para enviar uma imagem agora pelo site, escolha{' '}
                    <Link to={guia('prints')}>Prints</Link>.
                  </p>
                </>
              )}
              {assunto === 'excel' && (
                <>
                  <p>
                    Baixe os resultados do Painel em Excel. A exportação exige
                    entrar na sua conta e também está disponível no acesso de
                    leitura.
                  </p>
                  <ol className="ajuda-passos">
                    <li>
                      <strong>Abra o Painel e confira os filtros.</strong>{' '}
                      Escolha o período e as demais seleções. Filtros inválidos
                      no endereço usam os valores padrão apresentados pela tela.
                    </li>
                    <li>
                      <strong>Escolha Exportar Painel em Excel.</strong> O
                      arquivo painel.xlsx usa o recorte confirmado pelo serviço,
                      com todos os dias e tipsters do período; a janela de dias
                      visível não limita o arquivo.
                    </li>
                    <li>
                      <strong>Confira o escopo no arquivo.</strong> Os
                      resultados estão em reais, pela data da aposta e pelo fuso
                      de Brasília. O saldo global e a evolução legada têm seus
                      próprios escopos, indicados no Painel.
                    </li>
                  </ol>
                  <p>
                    Se o download falhar, use a recuperação indicada na tela e
                    respeite o prazo antes de tentar novamente. Baixar o Excel
                    não altera suas apostas.
                  </p>
                  <div className="acoes">
                    <Link to={destino('/painel')}>
                      Abrir Painel para exportar
                    </Link>
                  </div>
                  <p>
                    Para exportar todos os seus registros pessoais, use{' '}
                    <Link to={destino('/configuracoes/privacidade')}>
                      Configurações → Privacidade
                    </Link>
                    . Essa exportação é global e não aplica os filtros do
                    Painel.
                  </p>
                </>
              )}
            </section>
          </div>
        )}
      </main>
      <footer className="ajuda-rodape">
        <p>
          Precisa entrar para enviar ou consultar suas apostas. Esta ajuda é
          pública.
        </p>
        <PreferenciaTema />
      </footer>
    </div>
  );
}

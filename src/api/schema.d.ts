export interface paths {
  '/api/v1/apostas': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /**
     * Listar apostas
     * @description Lista apostas do usuário com filtros temporais, dimensionais e paginação.
     */
    get: operations['listar_apostas_api_v1_apostas_get'];
    put?: never;
    /**
     * Criar aposta manual
     * @description Cria uma aposta manual e registra o primeiro evento em seu histórico auditável.
     */
    post: operations['criar_aposta_api_v1_apostas_post'];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/api/v1/apostas/importar-planilha': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /**
     * Importar apostas do Excel
     * @description Importa um XLSX com origem_id estável; identifica cada aposta pela aba e linha e aplica somente versões mais recentes.
     */
    post: operations['importar_planilha_api_v1_apostas_importar_planilha_post'];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/api/v1/apostas/{chave}': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /**
     * Consultar aposta
     * @description Retorna a aposta materializada, suas seleções, eventos e eventual revisão pendente.
     */
    get: operations['ver_aposta_api_v1_apostas__chave__get'];
    put?: never;
    post?: never;
    /**
     * Excluir aposta da apuração
     * @description Marca a aposta para não participar da apuração sem apagar seu histórico.
     */
    delete: operations['apagar_aposta_api_v1_apostas__chave__delete'];
    options?: never;
    head?: never;
    /**
     * Corrigir aposta
     * @description Acrescenta uma correção manual ao histórico e rematerializa a aposta.
     */
    patch: operations['corrigir_aposta_api_v1_apostas__chave__patch'];
    trace?: never;
  };
  '/api/v1/apostas/{chave}/restaurar': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /**
     * Restaurar aposta na apuração
     * @description Volta a incluir uma aposta anteriormente excluída, preservando todo o histórico.
     */
    post: operations['restaurar_aposta_api_v1_apostas__chave__restaurar_post'];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/api/v1/apostas/{chave}/resultado': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /**
     * Registrar resultado da aposta
     * @description Registra liquidação, cashout ou reabertura e rematerializa os valores financeiros.
     */
    post: operations['registrar_resultado_api_v1_apostas__chave__resultado_post'];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/api/v1/caixa': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /**
     * Listar movimentos de caixa
     * @description Lista movimentos financeiros do usuário com filtros e paginação.
     */
    get: operations['listar_movimentos_api_v1_caixa_get'];
    put?: never;
    /**
     * Registrar movimento de caixa
     * @description Registra depósito, saque, ajuste ou transferência como lançamentos auditáveis.
     */
    post: operations['registrar_movimento_api_v1_caixa_post'];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/api/v1/caixa/contas/{conta_casa_id}/banca': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    /**
     * Vincular conta à banca
     * @description Associa ou desassocia uma conta da casa a uma banca do mesmo usuário.
     */
    patch: operations['vincular_banca_api_v1_caixa_contas__conta_casa_id__banca_patch'];
    trace?: never;
  };
  '/api/v1/caixa/extrato': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /**
     * Consultar extrato
     * @description Combina movimentos de caixa e liquidações de apostas numa linha do tempo paginada.
     */
    get: operations['consultar_extrato_api_v1_caixa_extrato_get'];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/api/v1/caixa/saldo': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /**
     * Consultar saldos
     * @description Calcula saldos conhecidos das contas a partir de movimentos e apostas.
     */
    get: operations['consultar_saldo_api_v1_caixa_saldo_get'];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/api/v1/coleta': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /**
     * Receber coleta da extensão
     * @description Alias versionado para receber um lote bruto e agendar sua materialização idempotente.
     */
    post: operations['receber_coleta_api_v1_coleta_post'];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/api/v1/painel': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /**
     * Consultar painel financeiro
     * @description Lê agregados materializados e informa separadamente frescor dos dados e atraso da réplica.
     */
    get: operations['consultar_painel_api_v1_painel_get'];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/api/v1/painel/export': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /**
     * Exportar painel em Excel
     * @description Gera um XLSX write-only e o transmite sem manter o arquivo completo em memória.
     */
    get: operations['exportar_painel_api_v1_painel_export_get'];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/api/v1/painel/metricas': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /**
     * Consultar séries para gráficos
     * @description Retorna séries temporais já agregadas para os gráficos do painel.
     */
    get: operations['consultar_metricas_api_v1_painel_metricas_get'];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/api/v1/revisao': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /**
     * Listar revisões pendentes
     * @description Lista revisões do usuário por motivo, intervalo e paginação.
     */
    get: operations['listar_revisoes_api_v1_revisao_get'];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/api/v1/revisao/stats': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /**
     * Consultar estatísticas de revisão
     * @description Retorna volume, motivos e idade da fila de revisões pendentes do usuário.
     */
    get: operations['consultar_estatisticas_api_v1_revisao_stats_get'];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/api/v1/revisao/{revisao_id}': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /**
     * Consultar revisão
     * @description Retorna os dados auditáveis de uma revisão pertencente ao usuário.
     */
    get: operations['ver_revisao_api_v1_revisao__revisao_id__get'];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/api/v1/revisao/{revisao_id}/foto': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /**
     * Consultar foto da revisão
     * @description Transmite a imagem privada ligada a uma revisão pendente.
     */
    get: operations['ver_foto_api_v1_revisao__revisao_id__foto_get'];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/api/v1/revisao/{revisao_id}/resolver': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /**
     * Resolver revisão
     * @description Corrige ou descarta uma revisão sob trava transacional e registra os eventos resultantes.
     */
    post: operations['resolver_revisao_api_v1_revisao__revisao_id__resolver_post'];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/api/v1/upload': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /**
     * Enviar exportação do Telegram
     * @description Valida e guarda uma exportação do Telegram antes de agendar seu processamento assíncrono.
     */
    post: operations['receber_export_api_v1_upload_post'];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/api/v1/upload/{job_id}': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /**
     * Consultar processamento do upload
     * @description Retorna estado, progresso, contagens e custo observado de um upload do usuário.
     */
    get: operations['consultar_upload_api_v1_upload__job_id__get'];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/coleta': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /**
     * Receber coleta da extensão
     * @description Recebe um lote bruto capturado pela extensão e agenda a materialização idempotente.
     */
    post: operations['receber_coleta_coleta_post'];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/health': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /**
     * Consultar liveness
     * @description Confirma que o processo HTTP está vivo sem consultar dependências externas.
     */
    get: operations['health_health_get'];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/metrics': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /**
     * Exportar métricas Prometheus
     * @description Expõe métricas da API, filas, materialização e circuit breakers no formato Prometheus.
     */
    get: operations['metrics_metrics_get'];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/ready': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /**
     * Consultar readiness
     * @description Verifica de forma limitada e concorrente as dependências necessárias para receber tráfego.
     */
    get: operations['ready_ready_get'];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
}
export type webhooks = Record<string, never>;
export interface components {
  schemas: {
    /** ApostaExtratoSaida */
    ApostaExtratoSaida: {
      /** Chave */
      chave: string | null;
      /** Conta Casa Id */
      conta_casa_id: number | null;
      /** Data Referencia */
      data_referencia: string | null;
      /**
       * Data Referencia Origem
       * @enum {string}
       */
      data_referencia_origem: 'data_aposta' | 'criada_em';
      /**
       * Estado
       * @enum {string}
       */
      estado:
        'GREEN' | 'RED' | 'ANULADA' | 'MEIO_GREEN' | 'MEIO_RED' | 'CASHOUT';
      /** Id */
      id: number;
      /** Liquidada Em */
      liquidada_em: null;
      /**
       * @description discriminator enum property added by openapi-typescript
       * @enum {string}
       */
      origem: 'aposta';
      /** Resultado Liquido Centavos */
      resultado_liquido_centavos: number | null;
      /** Retorno Centavos */
      retorno_centavos: number | null;
      /** Revisao Grave */
      revisao_grave: boolean;
      /** Stake Centavos */
      stake_centavos: number;
      /**
       * Tipo
       * @constant
       */
      tipo: 'APOSTA_LIQUIDADA';
    };
    /** ApostaManual */
    ApostaManual: {
      /**
       * @description Nome canônico, grafia minúscula ou domínio oficial da casa.
       * @enum {string}
       */
      casa:
        | '4Play'
        | '4play'
        | '7Games'
        | '7K Bet'
        | '7games'
        | '7k'
        | '7k bet'
        | 'Afun'
        | 'Aposta Ganha'
        | 'ApostaMax'
        | 'BandBet'
        | 'Bateu'
        | 'Bet da Sorte'
        | 'BetBoom'
        | 'BetEsporte'
        | 'BetFast'
        | 'BetGo'
        | 'BetMGM'
        | 'BetPix365'
        | 'BetSul'
        | 'BetVIP'
        | 'Betano'
        | 'Betboo'
        | 'Betfair'
        | 'Betgorillas'
        | 'Betnacional'
        | 'Betsson'
        | 'Betão'
        | 'Bingo Plus'
        | 'Blaze'
        | 'Bolsa de Aposta'
        | 'Casa de Apostas'
        | 'Esportes da Sorte'
        | 'Esportiva Bet'
        | 'EstrelaBet'
        | 'Faz1 Bet'
        | 'Ginga'
        | 'JogaJunto'
        | 'Jogo de Ouro'
        | 'JonBet'
        | 'KTO'
        | 'KingPanda'
        | 'Lottu'
        | 'MC Games'
        | 'Meridianbet'
        | 'Novibet'
        | 'Pagol'
        | 'Pinnacle'
        | 'Pitaco'
        | 'Pix.bet'
        | 'Sportingbet'
        | 'Stake'
        | 'Superbet'
        | 'Tivo'
        | 'VBet'
        | 'VaideBet'
        | 'Vupi'
        | 'afun'
        | 'aposta ganha'
        | 'apostaganha'
        | 'apostamax'
        | 'bandbet'
        | 'bateu'
        | 'bet da sorte'
        | 'bet365'
        | 'betano'
        | 'betao'
        | 'betboo'
        | 'betboom'
        | 'betdasorte'
        | 'betesporte'
        | 'betfair'
        | 'betfast'
        | 'betgo'
        | 'betgorillas'
        | 'betmgm'
        | 'betnacional'
        | 'betpix365'
        | 'betsson'
        | 'betsul'
        | 'betvip'
        | 'betão'
        | 'bingo plus'
        | 'bingoplus'
        | 'blaze'
        | 'bolsa de aposta'
        | 'bolsadeaposta'
        | 'casa de apostas'
        | 'casadeapostas'
        | 'esportes da sorte'
        | 'esportesdasorte'
        | 'esportiva'
        | 'esportiva bet'
        | 'estrelabet'
        | 'faz1'
        | 'faz1 bet'
        | 'ginga'
        | 'jogajunto'
        | 'jogo de ouro'
        | 'jogodeouro'
        | 'jonbet'
        | 'kingpanda'
        | 'kto'
        | 'lottu'
        | 'mc games'
        | 'mcgames'
        | 'meridianbet'
        | 'novibet'
        | 'pagol'
        | 'pinnacle'
        | 'pitaco'
        | 'pix'
        | 'pix.bet'
        | 'sportingbet'
        | 'stake'
        | 'superbet'
        | 'tivo'
        | 'vaidebet'
        | 'vbet'
        | 'vupi';
      comissao_centavos?: number | null;
      data_aposta?: string | null;
      /** Descricao */
      descricao?: string | null;
      /** Evento */
      evento?: string | null;
      /**
       * Freebet
       * @default false
       */
      freebet: boolean;
      /** Mercado Bruto */
      mercado_bruto?: string | null;
      odd: number;
      stake_unidades: number;
    };
    /** BetChangedResponse */
    BetChangedResponse: {
      aposta: components['schemas']['BetResponse'];
      /** Eventos Gravados */
      eventos_gravados: number;
    };
    /** BetCreatedResponse */
    BetCreatedResponse: {
      aposta: components['schemas']['BetResponse'];
      /** Aviso */
      aviso?: string | null;
      /** Casa Id */
      casa_id: number | null;
    };
    /** BetDetailResponse */
    BetDetailResponse: {
      aposta: components['schemas']['BetResponse'];
      /** Eventos */
      eventos: components['schemas']['BetEventResponse'][];
      revisao_pendente: components['schemas']['PendingReviewResponse'] | null;
      selecoes: components['schemas']['BetSelectionsResponse'];
    };
    /** BetEventResponse */
    BetEventResponse: {
      /** Confianca */
      confianca: number | null;
      /** Criado Em */
      criado_em: string | null;
      /** Fonte */
      fonte: string;
      /** Payload */
      payload: {
        [key: string]: components['schemas']['JsonValue'];
      };
      /** Tipo */
      tipo: string;
    };
    /** BetResponse */
    BetResponse: {
      /** Apagada */
      apagada: boolean;
      /** Atualizada Em */
      atualizada_em: string | null;
      /** Casa */
      casa: string | null;
      /** Chat Id */
      chat_id: number | null;
      /** Chave */
      chave: string;
      /** Competicao Id */
      competicao_id: number | null;
      /** Conta Casa Id */
      conta_casa_id: number | null;
      /** Criada Em */
      criada_em: string | null;
      /** Data Aposta */
      data_aposta: string | null;
      /** Data Jogo */
      data_jogo: string | null;
      /** Descricao */
      descricao: string | null;
      /** Estado */
      estado: string;
      /** Evento */
      evento: string | null;
      /** Freebet */
      freebet: boolean;
      /** Lucro Centavos */
      lucro_centavos: number | null;
      /** Mercado */
      mercado: string | null;
      /** Mercado Id */
      mercado_id: number | null;
      /** Message Id */
      message_id: number | null;
      /** Midia Hash */
      midia_hash: string | null;
      /** Odd */
      odd: number | null;
      /** Origem */
      origem: string;
      /** Retorno Centavos */
      retorno_centavos: number | null;
      /** Revisao Grave */
      revisao_grave: boolean;
      /** Stake Centavos */
      stake_centavos: number;
      /** Stake Unidades */
      stake_unidades: number;
      /** Time Casa Id */
      time_casa_id: number | null;
      /** Time Fora Id */
      time_fora_id: number | null;
      /** Tipster Id */
      tipster_id: number | null;
      /** Valor Aposta Centavos */
      valor_aposta_centavos: number;
    };
    /** BetSelectionsResponse */
    BetSelectionsResponse: {
      /** Casa */
      casa: string | null;
      /** Descricao */
      descricao: string | null;
      /** Evento */
      evento: string | null;
      /** Mercado */
      mercado: string | null;
    };
    /** BetsPageResponse */
    BetsPageResponse: {
      /** Data */
      data: components['schemas']['BetResponse'][];
      pagination: components['schemas']['PaginationResponse'];
    };
    /** Body_importar_planilha_api_v1_apostas_importar_planilha_post */
    Body_importar_planilha_api_v1_apostas_importar_planilha_post: {
      /**
       * Arquivo
       * @description Arquivo .xlsx no modelo de importação
       */
      arquivo: string;
      /**
       * Origem Id
       * @description Identificador estável da planilha entre importações
       */
      origem_id: string;
    };
    /** CollectionRejectedItem */
    CollectionRejectedItem: {
      /** Identidade */
      identidade?: string | null;
      /** Motivo */
      motivo: string;
      /** Posicao */
      posicao: number;
    };
    /** CollectionResponse */
    CollectionResponse: {
      /** Antes Do Inicio */
      antes_do_inicio: number;
      /** Atualizadas */
      atualizadas: number;
      /** Em Duvida */
      em_duvida: number;
      /** Iguais A Existentes */
      iguais_a_existentes: number;
      /** Ja Conhecidas */
      ja_conhecidas: number;
      /** Novas Contando */
      novas_contando: number;
      /** Recusadas */
      recusadas: components['schemas']['CollectionRejectedItem'][];
      /** Sem Leitor */
      sem_leitor: components['schemas']['CollectionWithoutReaderItem'][];
    };
    /** CollectionWithoutReaderItem */
    CollectionWithoutReaderItem: {
      /** Casa */
      casa: string;
      /** Guardadas */
      guardadas: number;
      /** Recado */
      recado: string;
    };
    /**
     * Correcao
     * @description Campos de domínio que podem ser corrigidos; campos desconhecidos são recusados.
     */
    Correcao: {
      casa?: string | null;
      comissao_centavos?: number;
      competicao_id?: number | null;
      conta_casa_id?: number | null;
      data_aposta?: string | null;
      data_jogo?: string | null;
      descricao?: string | null;
      /** @enum {string} */
      estado?:
        | 'PENDENTE'
        | 'GREEN'
        | 'RED'
        | 'ANULADA'
        | 'MEIO_GREEN'
        | 'MEIO_RED'
        | 'CASHOUT';
      evento?: string | null;
      freebet?: boolean;
      mercado_id?: number | null;
      odd?: number;
      revisao_grave?: boolean;
      revisao_motivo?: string | null;
      stake_unidades?: number;
      time_casa_id?: number | null;
      time_fora_id?: number | null;
      tipster_id?: number | null;
    };
    /**
     * CorrecaoDaRevisao
     * @description Campos de domínio que podem ser corrigidos; campos desconhecidos são recusados.
     */
    CorrecaoDaRevisao: {
      casa?: string | null;
      comissao_centavos?: number;
      competicao_id?: number | null;
      conta_casa_id?: number | null;
      data_aposta?: string | null;
      data_jogo?: string | null;
      descricao?: string | null;
      /** @enum {string} */
      estado?:
        | 'PENDENTE'
        | 'GREEN'
        | 'RED'
        | 'ANULADA'
        | 'MEIO_GREEN'
        | 'MEIO_RED'
        | 'CASHOUT';
      evento?: string | null;
      freebet?: boolean;
      mercado_id?: number | null;
      odd?: number;
      stake_unidades?: number;
      time_casa_id?: number | null;
      time_fora_id?: number | null;
      tipster_id?: number | null;
    };
    /** DatasetSaida */
    DatasetSaida: {
      /** Chave */
      chave: string;
      /** Data */
      data: number[];
      /** Label */
      label: string;
      /** Unidade */
      unidade: string;
    };
    /** ErroSaida */
    ErroSaida: {
      /** Detail */
      detail: string;
    };
    /** ErroValidacaoSaida */
    ErroValidacaoSaida: {
      /** Detail */
      detail: components['schemas']['ItemErroValidacaoSaida'][];
    };
    ErrorOrValidationResponse:
      | components['schemas']['ErrorResponse']
      | components['schemas']['ValidationErrorResponse'];
    /**
     * ErrorResponse
     * @description Structured errors emitted by application and cross-cutting middleware.
     */
    ErrorResponse: {
      /** Detail */
      detail?: string | null;
      /** Erro */
      erro?: string | null;
      /** Error */
      error?: 'rate_limited' | null;
      /** Retry After */
      retry_after?: number | null;
    };
    /** EstatisticasSaida */
    EstatisticasSaida: {
      /** Idade Maxima Segundos */
      idade_maxima_segundos: number;
      /** Mais Antiga Em */
      mais_antiga_em: string | null;
      /** Por Motivo */
      por_motivo: {
        [key: string]: number;
      };
      /** Total */
      total: number;
    };
    /** EvolucaoSaida */
    EvolucaoSaida: {
      /** Banca Id */
      banca_id: number | null;
      /** Banca Nome */
      banca_nome: string | null;
      /** Lucro Acumulado Centavos */
      lucro_acumulado_centavos: number;
      /** Lucro Periodo Centavos */
      lucro_periodo_centavos: number;
      /**
       * Periodo Inicio
       * Format: date
       */
      periodo_inicio: string;
      /** Saldo Centavos */
      saldo_centavos: number | null;
    };
    /** ExtratoSaida */
    ExtratoSaida: {
      /** Data */
      data: (
        | components['schemas']['MovimentoExtratoSaida']
        | components['schemas']['ApostaExtratoSaida']
      )[];
      pagination: components['schemas']['PaginacaoSaida'];
    };
    /** GrupoSaida */
    GrupoSaida: {
      /** Familia */
      familia: string | null;
      /** Id */
      id: number | null;
      metricas: components['schemas']['MetricasSaida'];
      /** Nome */
      nome: string | null;
    };
    /** ItemErroValidacaoSaida */
    ItemErroValidacaoSaida: {
      /** Ctx */
      ctx?: {
        [key: string]: components['schemas']['JsonValue'];
      } | null;
      input?: components['schemas']['JsonValue'];
      /** Loc */
      loc: (string | number)[];
      /** Msg */
      msg: string;
      /** Type */
      type: string;
    };
    /**
     * JsonValue
     * @description A recursively typed JSON value; never an unconstrained Any schema.
     */
    JsonValue:
      | string
      | number
      | boolean
      | components['schemas']['JsonValue'][]
      | {
          [key: string]: components['schemas']['JsonValue'];
        }
      | null;
    /** LivenessResponse */
    LivenessResponse: {
      /**
       * Status
       * @constant
       */
      status: 'ok';
    };
    /** MetricasGraficosSaida */
    MetricasGraficosSaida: {
      /** Atualizado Em */
      atualizado_em: string | null;
      /** Datasets */
      datasets: components['schemas']['DatasetSaida'][];
      /**
       * Granularidade
       * @enum {string}
       */
      granularidade: 'dia' | 'semana' | 'mes';
      /** Idade Mv Segundos */
      idade_mv_segundos: string | null;
      /** Labels */
      labels: string[];
      /** Replica Atraso Disponivel */
      replica_atraso_disponivel: boolean;
      /**
       * Replica Atraso Estado
       * @enum {string}
       */
      replica_atraso_estado: 'disponivel' | 'primario_ou_sem_telemetria';
      /** Replica Atraso Segundos */
      replica_atraso_segundos: string | null;
      /**
       * Respondido Em
       * Format: date-time
       */
      respondido_em: string;
    };
    /** MetricasSaida */
    MetricasSaida: {
      /** Base Roi Centavos */
      base_roi_centavos: number;
      /** Freebets */
      freebets: number;
      /** Giro Centavos */
      giro_centavos: number;
      /** Greens */
      greens: number;
      /** Lucro Centavos */
      lucro_centavos: number;
      /** Pendentes */
      pendentes: number;
      /** Reds */
      reds: number;
      /** Retorno Centavos */
      retorno_centavos: number;
      /** Roi */
      roi: string;
      /** Roi Basis Points */
      roi_basis_points: number;
      /** Total Apostas */
      total_apostas: number;
      /** Win Rate */
      win_rate: string;
      /** Win Rate Basis Points */
      win_rate_basis_points: number;
    };
    /** MovimentoCriadoSaida */
    MovimentoCriadoSaida: {
      /** Movimentos */
      movimentos: components['schemas']['MovimentoSaida'][];
      /**
       * Tipo
       * @enum {string}
       */
      tipo: 'DEPOSITO' | 'SAQUE' | 'TRANSFERENCIA' | 'AJUSTE';
      /** Transferencia Id */
      transferencia_id: string | null;
    };
    /** MovimentoExtratoSaida */
    MovimentoExtratoSaida: {
      /** Conta Casa Id */
      conta_casa_id: number | null;
      /**
       * Data Referencia
       * Format: date-time
       */
      data_referencia: string;
      /** Descricao */
      descricao: string | null;
      /** Id */
      id: number;
      /**
       * Ocorrido Em
       * Format: date-time
       */
      ocorrido_em: string;
      /**
       * @description discriminator enum property added by openapi-typescript
       * @enum {string}
       */
      origem: 'movimento';
      /**
       * Tipo
       * @enum {string}
       */
      tipo: 'DEPOSITO' | 'SAQUE' | 'TRANSFERENCIA' | 'BONUS' | 'AJUSTE';
      /** Transferencia Id */
      transferencia_id: string | null;
      /** Valor Centavos */
      valor_centavos: number;
    };
    /**
     * MovimentoNovo
     * @description Pedido de caixa com regras condicionais publicadas também no OpenAPI.
     */
    MovimentoNovo: {
      /**
       * Conta Casa Destino Id
       * @description Obrigatória só para transferência e diferente da conta de origem
       */
      conta_casa_destino_id?: number | null;
      /**
       * Conta Casa Id
       * @description Obrigatória para depósito, saque e origem da transferência
       */
      conta_casa_id?: number | null;
      /** Descricao */
      descricao?: string | null;
      /**
       * Ocorrido Em
       * Format: date-time
       */
      ocorrido_em: string;
      /**
       * Tipo
       * @enum {string}
       */
      tipo: 'DEPOSITO' | 'SAQUE' | 'TRANSFERENCIA' | 'AJUSTE';
      /**
       * Valor Centavos
       * @description Valor em centavos; positivo salvo para AJUSTE
       */
      valor_centavos: number;
    } & (unknown & unknown & unknown);
    /** MovimentoSaida */
    MovimentoSaida: {
      /** Conta Casa Id */
      conta_casa_id: number | null;
      /** Descricao */
      descricao: string | null;
      /** Id */
      id: number;
      /**
       * Ocorrido Em
       * Format: date-time
       */
      ocorrido_em: string;
      /**
       * Tipo
       * @enum {string}
       */
      tipo: 'DEPOSITO' | 'SAQUE' | 'TRANSFERENCIA' | 'BONUS' | 'AJUSTE';
      /** Transferencia Id */
      transferencia_id: string | null;
      /** Valor Centavos */
      valor_centavos: number;
    };
    /** MovimentosPaginaSaida */
    MovimentosPaginaSaida: {
      /** Data */
      data: components['schemas']['MovimentoSaida'][];
      pagination: components['schemas']['PaginacaoSaida'];
    };
    /** PaginacaoSaida */
    PaginacaoSaida: {
      /** Page */
      page: number;
      /** Page Size */
      page_size: number;
      /** Total */
      total: number;
    };
    /** PaginationResponse */
    PaginationResponse: {
      /** Page */
      page: number;
      /** Page Size */
      page_size: number;
      /** Total */
      total: number;
    };
    /** PainelSaida */
    PainelSaida: {
      /** Atualizado Em */
      atualizado_em: string | null;
      /** Evolucao */
      evolucao: components['schemas']['EvolucaoSaida'][];
      /** Idade Mv Segundos */
      idade_mv_segundos: string | null;
      /** Por Casa */
      por_casa: components['schemas']['GrupoSaida'][];
      /** Por Mercado */
      por_mercado: components['schemas']['GrupoSaida'][];
      /** Por Tipster */
      por_tipster: components['schemas']['GrupoSaida'][];
      /** Replica Atraso Disponivel */
      replica_atraso_disponivel: boolean;
      /**
       * Replica Atraso Estado
       * @enum {string}
       */
      replica_atraso_estado: 'disponivel' | 'primario_ou_sem_telemetria';
      /** Replica Atraso Segundos */
      replica_atraso_segundos: string | null;
      /**
       * Respondido Em
       * Format: date-time
       */
      respondido_em: string;
      resumo: components['schemas']['MetricasSaida'];
      saldo: components['schemas']['bancaemdia__api__v1__painel__SaldoSaida'];
    };
    /** PendingReviewResponse */
    PendingReviewResponse: {
      /** Criado Em */
      criado_em: string | null;
      /** Id */
      id: number;
      /** Midia Hash */
      midia_hash: string | null;
      /** Motivo */
      motivo: string;
    };
    /**
     * PeriodoPainel
     * @enum {string}
     */
    PeriodoPainel: '7d' | '30d' | '90d' | '1y' | 'all';
    /** PlanilhaImportada */
    PlanilhaImportada: {
      /** Atualizadas */
      atualizadas: number;
      /** Criadas */
      criadas: number;
      /** Ignoradas */
      ignoradas: number;
    };
    /** ReadinessCheckResponse */
    ReadinessCheckResponse: {
      /** Details */
      details?: {
        [key: string]: components['schemas']['JsonValue'];
      } | null;
      /**
       * Impact
       * @enum {string}
       */
      impact: 'required' | 'report_only';
      /** Latency Ms */
      latency_ms: number;
      /**
       * Status
       * @enum {string}
       */
      status: 'ok' | 'failed' | 'degraded';
    };
    /** ReadinessResponse */
    ReadinessResponse: {
      /** Checks */
      checks: {
        [key: string]: components['schemas']['ReadinessCheckResponse'];
      };
      /**
       * Status
       * @enum {string}
       */
      status: 'ready' | 'not_ready';
    };
    /** ResolucaoNova */
    ResolucaoNova: {
      /**
       * Acao
       * @enum {string}
       */
      acao: 'CORRIGIR' | 'DESCARTAR' | 'MESMA';
      aposta_corrigida?: components['schemas']['CorrecaoDaRevisao'] | null;
    };
    /** ResolucaoSaida */
    ResolucaoSaida: {
      /**
       * Acao
       * @enum {string}
       */
      acao: 'CORRIGIR' | 'DESCARTAR' | 'MESMA';
      aposta: components['schemas']['BetResponse'];
      /** Eventos Gravados */
      eventos_gravados: number;
      revisao: components['schemas']['RevisaoFechadaSaida'];
    };
    /** Resultado */
    Resultado: {
      cashout_valor_centavos?: number | null;
      comissao_centavos?: number | null;
      /** @enum {string} */
      estado:
        | 'PENDENTE'
        | 'GREEN'
        | 'RED'
        | 'ANULADA'
        | 'MEIO_GREEN'
        | 'MEIO_RED'
        | 'CASHOUT';
      retorno_centavos?: number | null;
    } & unknown;
    /** RevisaoFechadaSaida */
    RevisaoFechadaSaida: {
      /** Id */
      id: number;
      /**
       * Resolvido Em
       * Format: date-time
       */
      resolvido_em: string;
    };
    /** RevisaoSaida */
    RevisaoSaida: {
      /**
       * Criado Em
       * Format: date-time
       */
      criado_em: string;
      /** Extracao Bruta */
      extracao_bruta: {
        [key: string]: components['schemas']['JsonValue'];
      } | null;
      /** Foto Url */
      foto_url: string | null;
      /** Id */
      id: number;
      /** Midia Hash */
      midia_hash: string | null;
      /** Motivo */
      motivo: string;
      /** Resolvido Em */
      resolvido_em: string | null;
    };
    /** RevisoesPaginaSaida */
    RevisoesPaginaSaida: {
      /** Data */
      data: components['schemas']['RevisaoSaida'][];
      pagination: components['schemas']['PaginacaoSaida'];
    };
    /** SaldoBancaSaida */
    SaldoBancaSaida: {
      /** Id */
      id: number;
      /** Motivo Saldo Indisponivel */
      motivo_saldo_indisponivel: string | null;
      /** Nome */
      nome: string;
      /** Saldo Inicial Centavos */
      saldo_inicial_centavos: number | null;
      /** Saldo Total Centavos */
      saldo_total_centavos: number | null;
    };
    /** SaldoContaSaida */
    SaldoContaSaida: {
      /** Apelido */
      apelido: string;
      /** Apostado Centavos */
      apostado_centavos: number;
      /** Apostas Pendentes */
      apostas_pendentes: number;
      /** Banca Id */
      banca_id: number | null;
      /** Bonus Centavos */
      bonus_centavos: number;
      /** Casa Id */
      casa_id: number;
      /** Conta Casa Id */
      conta_casa_id: number;
      /** Depositado Centavos */
      depositado_centavos: number;
      /** Deposito Faltante Centavos */
      deposito_faltante_centavos: number;
      /** Desde */
      desde: string | null;
      /** Em Jogo Centavos */
      em_jogo_centavos: number;
      /** Movido Centavos */
      movido_centavos: number;
      /** Movimentos */
      movimentos: number;
      /** Retornado Centavos */
      retornado_centavos: number;
      /** Sacado Centavos */
      sacado_centavos: number;
      /** Saldo Atual Centavos */
      saldo_atual_centavos: number | null;
      /** Saldo Confiavel */
      saldo_confiavel: boolean;
    };
    /**
     * TipoMovimentoConsulta
     * @enum {string}
     */
    TipoMovimentoConsulta:
      'DEPOSITO' | 'SAQUE' | 'TRANSFERENCIA' | 'BONUS' | 'AJUSTE';
    /** UploadAcceptedResponse */
    UploadAcceptedResponse: {
      /** Aviso */
      aviso?: string | null;
      /** Estimated Bets */
      estimated_bets: number;
      /** Estimated Cost Usd */
      estimated_cost_usd: number;
      /**
       * Job Id
       * Format: uuid
       */
      job_id: string;
      /** Status Url */
      status_url: string;
    };
    /** UploadProgressResponse */
    UploadProgressResponse: {
      /** Failed */
      failed: number;
      /** Ignored */
      ignored: number;
      /** Over Limit */
      over_limit: number;
      /** Pending */
      pending: number;
      /** Percent */
      percent: number;
      /** Read */
      read: number;
      /** Total */
      total: number;
    };
    /** UploadStatusResponse */
    UploadStatusResponse: {
      /** Bets Failed */
      bets_failed: number;
      /** Bets Processed */
      bets_processed: number;
      /** Concluido Em */
      concluido_em: string | null;
      /** Cost Usd */
      cost_usd: number;
      /**
       * Criado Em
       * Format: date-time
       */
      criado_em: string;
      /** Erro */
      erro: string | null;
      /** Estimated Bets */
      estimated_bets: number;
      /** Estimated Cost Usd */
      estimated_cost_usd: number;
      /** Filename */
      filename: string;
      /**
       * Job Id
       * Format: uuid
       */
      job_id: string;
      progress: components['schemas']['UploadProgressResponse'];
      /** Status */
      status: string;
      /** Total Messages */
      total_messages: number;
    };
    /** ValidationErrorResponse */
    ValidationErrorResponse: {
      /** Detail */
      detail: components['schemas']['ValidationIssueResponse'][];
    };
    /** ValidationIssueResponse */
    ValidationIssueResponse: {
      /** Ctx */
      ctx?: {
        [key: string]: components['schemas']['JsonValue'];
      } | null;
      input?: components['schemas']['JsonValue'];
      /** Loc */
      loc: (string | number)[];
      /** Msg */
      msg: string;
      /** Type */
      type: string;
    };
    /** VinculoBancaNovo */
    VinculoBancaNovo: {
      /** Banca Id */
      banca_id: number | null;
    };
    /** VinculoBancaSaida */
    VinculoBancaSaida: {
      /** Banca Id */
      banca_id: number | null;
      /** Conta Casa Id */
      conta_casa_id: number;
    };
    /** SaldoSaida */
    bancaemdia__api__v1__caixa__SaldoSaida: {
      /** Bancas */
      bancas: components['schemas']['SaldoBancaSaida'][];
      /** Contas */
      contas: components['schemas']['SaldoContaSaida'][];
      /** Contas Sem Saldo Confiavel */
      contas_sem_saldo_confiavel: number;
      /** Data Corte */
      data_corte: string | null;
      /** Saldo Conhecido Centavos */
      saldo_conhecido_centavos: number;
      /** Saldo Total Centavos */
      saldo_total_centavos: number | null;
      /**
       * Saldo Total Escopo
       * @constant
       */
      saldo_total_escopo: 'contas_casa';
    };
    /** SaldoSaida */
    bancaemdia__api__v1__painel__SaldoSaida: {
      /** Contas Saldo Desconhecido */
      contas_saldo_desconhecido: number;
      /**
       * Escopo
       * @constant
       */
      escopo: 'contas_casa_all_time';
      /** Saldo Conhecido Centavos */
      saldo_conhecido_centavos: number;
      /** Saldo Total Centavos */
      saldo_total_centavos: number | null;
    };
  };
  responses: never;
  parameters: never;
  requestBodies: never;
  headers: never;
  pathItems: never;
}
export type $defs = Record<string, never>;
export interface operations {
  listar_apostas_api_v1_apostas_get: {
    parameters: {
      query?: {
        /** @description Limite inicial inclusivo do intervalo, em ISO 8601. */
        desde?: string | null;
        /** @description Limite final exclusivo do intervalo, em ISO 8601. */
        ate?: string | null;
        /** @description Estado de liquidação da aposta usado como filtro. */
        estado?: string | null;
        /** @description Identificador canônico da casa usada como filtro. */
        casa_id?: number | null;
        /** @description Identificador canônico do tipster usado como filtro. */
        tipster_id?: number | null;
        /** @description Identificador canônico do mercado usado como filtro. */
        mercado_id?: number | null;
        /** @description Identificador canônico da competição usada como filtro. */
        competicao_id?: number | null;
        /** @description Canal de origem da aposta usado como filtro. */
        origem?: string | null;
        /** @description Filtra apostas pela marca de revisão grave. */
        revisao_grave?: boolean | null;
        /** @description Inclui apostas retiradas da apuração quando verdadeiro. */
        incluir_apagadas?: boolean;
        /** @description Número da página, começando em 1. */
        page?: number;
        /** @description Quantidade máxima de itens retornados na página. */
        page_size?: number;
      };
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Successful Response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['BetsPageResponse'];
        };
      };
      /** @description Missing, expired, or invalid bearer token. */
      401: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description The request does not satisfy the published contract or a domain rule. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorOrValidationResponse'];
        };
      };
      /** @description The caller exceeded an applicable request limit. */
      429: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description Unexpected internal failure with no sensitive exception details. */
      500: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description A required dependency is temporarily unavailable. */
      503: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
    };
  };
  criar_aposta_api_v1_apostas_post: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody: {
      content: {
        'application/json': components['schemas']['ApostaManual'];
      };
    };
    responses: {
      /** @description Successful Response */
      201: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['BetCreatedResponse'];
        };
      };
      /** @description Missing, expired, or invalid bearer token. */
      401: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description Bet key collision. */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description The request body exceeds the server-wide streaming limit. */
      413: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          /** @example Content Too Large */
          'text/plain': string;
        };
      };
      /** @description The request does not satisfy the published contract or a domain rule. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorOrValidationResponse'];
        };
      };
      /** @description The caller exceeded an applicable request limit. */
      429: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description Unexpected internal failure with no sensitive exception details. */
      500: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description A required dependency is temporarily unavailable. */
      503: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
    };
  };
  importar_planilha_api_v1_apostas_importar_planilha_post: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody: {
      content: {
        'multipart/form-data': {
          /** Format: binary */
          arquivo: string;
          origem_id: string;
        };
      };
    };
    responses: {
      /** @description Successful Response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['PlanilhaImportada'];
        };
      };
      /** @description Missing, expired, or invalid bearer token. */
      401: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description The request body exceeds the server-wide streaming limit. */
      413: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          /** @example Content Too Large */
          'text/plain': string;
        };
      };
      /** @description Planilha inválida */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description The caller exceeded an applicable request limit. */
      429: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description Unexpected internal failure with no sensitive exception details. */
      500: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description A required dependency is temporarily unavailable. */
      503: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
    };
  };
  ver_aposta_api_v1_apostas__chave__get: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        /** @description Chave estável e opaca da aposta. */
        chave: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Successful Response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['BetDetailResponse'];
        };
      };
      /** @description Missing, expired, or invalid bearer token. */
      401: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description Bet not found. */
      404: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description The request does not satisfy the published contract or a domain rule. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorOrValidationResponse'];
        };
      };
      /** @description The caller exceeded an applicable request limit. */
      429: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description Unexpected internal failure with no sensitive exception details. */
      500: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description A required dependency is temporarily unavailable. */
      503: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
    };
  };
  apagar_aposta_api_v1_apostas__chave__delete: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        /** @description Chave estável e opaca da aposta. */
        chave: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Successful Response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['BetChangedResponse'];
        };
      };
      /** @description Missing, expired, or invalid bearer token. */
      401: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description Bet not found. */
      404: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description Bet is being updated concurrently. */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description The request does not satisfy the published contract or a domain rule. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorOrValidationResponse'];
        };
      };
      /** @description The caller exceeded an applicable request limit. */
      429: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description Unexpected internal failure with no sensitive exception details. */
      500: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description A required dependency is temporarily unavailable. */
      503: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
    };
  };
  corrigir_aposta_api_v1_apostas__chave__patch: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        /** @description Chave estável e opaca da aposta. */
        chave: string;
      };
      cookie?: never;
    };
    requestBody: {
      content: {
        'application/json': components['schemas']['Correcao'];
      };
    };
    responses: {
      /** @description Successful Response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['BetChangedResponse'];
        };
      };
      /** @description Missing, expired, or invalid bearer token. */
      401: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description Bet not found. */
      404: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description Bet is being updated concurrently. */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description The request body exceeds the server-wide streaming limit. */
      413: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          /** @example Content Too Large */
          'text/plain': string;
        };
      };
      /** @description The request does not satisfy the published contract or a domain rule. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorOrValidationResponse'];
        };
      };
      /** @description The caller exceeded an applicable request limit. */
      429: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description Unexpected internal failure with no sensitive exception details. */
      500: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description A required dependency is temporarily unavailable. */
      503: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
    };
  };
  restaurar_aposta_api_v1_apostas__chave__restaurar_post: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        /** @description Chave estável e opaca da aposta. */
        chave: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Successful Response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['BetChangedResponse'];
        };
      };
      /** @description Missing, expired, or invalid bearer token. */
      401: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description Bet not found. */
      404: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description Bet is being updated concurrently. */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description The request does not satisfy the published contract or a domain rule. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorOrValidationResponse'];
        };
      };
      /** @description The caller exceeded an applicable request limit. */
      429: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description Unexpected internal failure with no sensitive exception details. */
      500: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description A required dependency is temporarily unavailable. */
      503: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
    };
  };
  registrar_resultado_api_v1_apostas__chave__resultado_post: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        /** @description Chave estável e opaca da aposta. */
        chave: string;
      };
      cookie?: never;
    };
    requestBody: {
      content: {
        'application/json': components['schemas']['Resultado'];
      };
    };
    responses: {
      /** @description Successful Response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['BetChangedResponse'];
        };
      };
      /** @description Missing, expired, or invalid bearer token. */
      401: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description Bet not found. */
      404: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description Bet is being updated concurrently. */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description The request body exceeds the server-wide streaming limit. */
      413: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          /** @example Content Too Large */
          'text/plain': string;
        };
      };
      /** @description The request does not satisfy the published contract or a domain rule. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorOrValidationResponse'];
        };
      };
      /** @description The caller exceeded an applicable request limit. */
      429: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description Unexpected internal failure with no sensitive exception details. */
      500: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description A required dependency is temporarily unavailable. */
      503: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
    };
  };
  listar_movimentos_api_v1_caixa_get: {
    parameters: {
      query?: {
        /** @description Identificador da conta da casa usada como filtro. */
        conta_casa_id?: number | null;
        /** @description Tipo de movimento de caixa usado como filtro. */
        tipo?: components['schemas']['TipoMovimentoConsulta'] | null;
        /** @description Limite inicial inclusivo do intervalo, em ISO 8601. */
        desde?: string | null;
        /** @description Limite final exclusivo do intervalo, em ISO 8601. */
        ate?: string | null;
        /** @description Número da página, começando em 1. */
        page?: number;
        /** @description Quantidade máxima de itens retornados na página. */
        page_size?: number;
      };
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Successful Response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['MovimentosPaginaSaida'];
        };
      };
      /** @description Missing, expired, or invalid bearer token. */
      401: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description Filtro ou paginação inválidos */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json':
            | components['schemas']['ErroSaida']
            | components['schemas']['ErroValidacaoSaida'];
        };
      };
      /** @description The caller exceeded an applicable request limit. */
      429: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description Unexpected internal failure with no sensitive exception details. */
      500: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description A required dependency is temporarily unavailable. */
      503: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
    };
  };
  registrar_movimento_api_v1_caixa_post: {
    parameters: {
      query?: never;
      header: {
        /** @description Chave opaca obrigatória do cliente; reutilizá-la com o mesmo corpo reproduz a resposta original sem lançar dinheiro novamente. */
        'Idempotency-Key': string;
      };
      path?: never;
      cookie?: never;
    };
    requestBody: {
      content: {
        'application/json': components['schemas']['MovimentoNovo'];
      };
    };
    responses: {
      /** @description Successful Response */
      201: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['MovimentoCriadoSaida'];
        };
      };
      /** @description Missing, expired, or invalid bearer token. */
      401: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description Conta não encontrada */
      404: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErroSaida'];
        };
      };
      /** @description Conta ocupada ou chave de idempotência reutilizada com outro pedido */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErroSaida'];
        };
      };
      /** @description The request body exceeds the server-wide streaming limit. */
      413: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          /** @example Content Too Large */
          'text/plain': string;
        };
      };
      /** @description Pedido malformado ou movimento inválido */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json':
            | components['schemas']['ErroSaida']
            | components['schemas']['ErroValidacaoSaida'];
        };
      };
      /** @description The caller exceeded an applicable request limit. */
      429: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description Unexpected internal failure with no sensitive exception details. */
      500: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description A required dependency is temporarily unavailable. */
      503: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
    };
  };
  vincular_banca_api_v1_caixa_contas__conta_casa_id__banca_patch: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        /** @description Identificador da conta da casa usada como filtro. */
        conta_casa_id: number;
      };
      cookie?: never;
    };
    requestBody: {
      content: {
        'application/json': components['schemas']['VinculoBancaNovo'];
      };
    };
    responses: {
      /** @description Successful Response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['VinculoBancaSaida'];
        };
      };
      /** @description Missing, expired, or invalid bearer token. */
      401: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description Conta ou banca não encontrada */
      404: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErroSaida'];
        };
      };
      /** @description The request body exceeds the server-wide streaming limit. */
      413: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          /** @example Content Too Large */
          'text/plain': string;
        };
      };
      /** @description The request does not satisfy the published contract or a domain rule. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorOrValidationResponse'];
        };
      };
      /** @description The caller exceeded an applicable request limit. */
      429: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description Unexpected internal failure with no sensitive exception details. */
      500: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description A required dependency is temporarily unavailable. */
      503: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
    };
  };
  consultar_extrato_api_v1_caixa_extrato_get: {
    parameters: {
      query?: {
        /** @description Identificador da conta da casa usada como filtro. */
        conta_casa_id?: number | null;
        /** @description Limite inicial inclusivo do intervalo, em ISO 8601. */
        desde?: string | null;
        /** @description Limite final exclusivo do intervalo, em ISO 8601. */
        ate?: string | null;
        /** @description Número da página, começando em 1. */
        page?: number;
        /** @description Quantidade máxima de itens retornados na página. */
        page_size?: number;
      };
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Successful Response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ExtratoSaida'];
        };
      };
      /** @description Missing, expired, or invalid bearer token. */
      401: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description The request does not satisfy the published contract or a domain rule. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorOrValidationResponse'];
        };
      };
      /** @description The caller exceeded an applicable request limit. */
      429: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description Unexpected internal failure with no sensitive exception details. */
      500: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description A required dependency is temporarily unavailable. */
      503: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
    };
  };
  consultar_saldo_api_v1_caixa_saldo_get: {
    parameters: {
      query?: {
        /** @description Data civil opcional para reconstruir o saldo histórico. */
        data_corte?: string | null;
      };
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Successful Response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['bancaemdia__api__v1__caixa__SaldoSaida'];
        };
      };
      /** @description Missing, expired, or invalid bearer token. */
      401: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description The request does not satisfy the published contract or a domain rule. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorOrValidationResponse'];
        };
      };
      /** @description The caller exceeded an applicable request limit. */
      429: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description Unexpected internal failure with no sensitive exception details. */
      500: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description A required dependency is temporarily unavailable. */
      503: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
    };
  };
  receber_coleta_api_v1_coleta_post: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody: {
      content: {
        'application/json': {
          apostas: components['schemas']['JsonValue'][];
          /** @description Metadado informativo enviado pela extensão; o servidor o ignora para ordenação e aceita clientes legados. */
          capturado_em?: components['schemas']['JsonValue'];
          casa: string;
          /** @constant */
          contrato: 1;
        } & {
          [key: string]: components['schemas']['JsonValue'];
        };
      };
    };
    responses: {
      /** @description Successful Response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['CollectionResponse'];
        };
      };
      /** @description Malformed collection payload. */
      400: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description Invalid collection token. */
      403: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description The request body exceeds the server-wide streaming limit. */
      413: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          /** @example Content Too Large */
          'text/plain': string;
        };
      };
      /** @description The collection rate or daily limit was exceeded. */
      429: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description Unexpected internal failure with no sensitive exception details. */
      500: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description The collection was saved but could not be queued. */
      503: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
    };
  };
  consultar_painel_api_v1_painel_get: {
    parameters: {
      query?: {
        /** @description Janela civil de agregação no fuso America/Sao_Paulo. */
        periodo?: components['schemas']['PeriodoPainel'];
        /** @description Identificador canônico da casa usada como filtro. */
        casa_id?: number | null;
        /** @description Identificador canônico do tipster usado como filtro. */
        tipster_id?: number | null;
        /** @description Identificador canônico do mercado usado como filtro. */
        mercado_id?: number | null;
        /** @description Lê no primário quando verdadeiro, sem forçar refresh das materialized views. */
        fresh?: boolean;
      };
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Successful Response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['PainelSaida'];
        };
      };
      /** @description Missing, expired, or invalid bearer token. */
      401: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description The request does not satisfy the published contract or a domain rule. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorOrValidationResponse'];
        };
      };
      /** @description The caller exceeded an applicable request limit. */
      429: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description Unexpected internal failure with no sensitive exception details. */
      500: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description A required dependency is temporarily unavailable. */
      503: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
    };
  };
  exportar_painel_api_v1_painel_export_get: {
    parameters: {
      query?: {
        /** @description Janela civil de agregação no fuso America/Sao_Paulo. */
        periodo?: components['schemas']['PeriodoPainel'];
        /** @description Identificador canônico da casa usada como filtro. */
        casa_id?: number | null;
        /** @description Identificador canônico do tipster usado como filtro. */
        tipster_id?: number | null;
        /** @description Identificador canônico do mercado usado como filtro. */
        mercado_id?: number | null;
      };
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Streaming Excel workbook. */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': string;
        };
      };
      /** @description Missing, expired, or invalid bearer token. */
      401: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description The request does not satisfy the published contract or a domain rule. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorOrValidationResponse'];
        };
      };
      /** @description The caller exceeded an applicable request limit. */
      429: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description Unexpected internal failure with no sensitive exception details. */
      500: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description A required dependency is temporarily unavailable. */
      503: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
    };
  };
  consultar_metricas_api_v1_painel_metricas_get: {
    parameters: {
      query?: {
        /** @description Janela civil de agregação no fuso America/Sao_Paulo. */
        periodo?: components['schemas']['PeriodoPainel'];
        /** @description Identificador canônico da casa usada como filtro. */
        casa_id?: number | null;
        /** @description Identificador canônico do tipster usado como filtro. */
        tipster_id?: number | null;
        /** @description Identificador canônico do mercado usado como filtro. */
        mercado_id?: number | null;
      };
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Successful Response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['MetricasGraficosSaida'];
        };
      };
      /** @description Missing, expired, or invalid bearer token. */
      401: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description The request does not satisfy the published contract or a domain rule. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorOrValidationResponse'];
        };
      };
      /** @description The caller exceeded an applicable request limit. */
      429: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description Unexpected internal failure with no sensitive exception details. */
      500: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description A required dependency is temporarily unavailable. */
      503: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
    };
  };
  listar_revisoes_api_v1_revisao_get: {
    parameters: {
      query?: {
        /** @description Texto do motivo usado para filtrar a fila de revisões. */
        motivo?: string | null;
        /** @description Limite inicial inclusivo do intervalo, em ISO 8601. */
        desde?: string | null;
        /** @description Limite final exclusivo do intervalo, em ISO 8601. */
        ate?: string | null;
        /** @description Número da página, começando em 1. */
        page?: number;
        /** @description Quantidade máxima de itens retornados na página. */
        page_size?: number;
      };
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Successful Response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['RevisoesPaginaSaida'];
        };
      };
      /** @description Missing, expired, or invalid bearer token. */
      401: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description The request does not satisfy the published contract or a domain rule. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorOrValidationResponse'];
        };
      };
      /** @description The caller exceeded an applicable request limit. */
      429: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description Unexpected internal failure with no sensitive exception details. */
      500: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description A required dependency is temporarily unavailable. */
      503: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
    };
  };
  consultar_estatisticas_api_v1_revisao_stats_get: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Successful Response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['EstatisticasSaida'];
        };
      };
      /** @description Missing, expired, or invalid bearer token. */
      401: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description The request does not satisfy the published contract or a domain rule. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorOrValidationResponse'];
        };
      };
      /** @description The caller exceeded an applicable request limit. */
      429: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description Unexpected internal failure with no sensitive exception details. */
      500: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description A required dependency is temporarily unavailable. */
      503: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
    };
  };
  ver_revisao_api_v1_revisao__revisao_id__get: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        /** @description Identificador numérico da revisão pertencente ao usuário. */
        revisao_id: number;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Successful Response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['RevisaoSaida'];
        };
      };
      /** @description Missing, expired, or invalid bearer token. */
      401: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description Revisão não encontrada */
      404: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErroSaida'];
        };
      };
      /** @description The request does not satisfy the published contract or a domain rule. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorOrValidationResponse'];
        };
      };
      /** @description The caller exceeded an applicable request limit. */
      429: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description Unexpected internal failure with no sensitive exception details. */
      500: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description A required dependency is temporarily unavailable. */
      503: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
    };
  };
  ver_foto_api_v1_revisao__revisao_id__foto_get: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        /** @description Identificador numérico da revisão pertencente ao usuário. */
        revisao_id: number;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Original review image. */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/octet-stream': string;
          'image/gif': string;
          'image/jpeg': string;
          'image/png': string;
          'image/webp': string;
        };
      };
      /** @description Missing, expired, or invalid bearer token. */
      401: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description Revisão ou foto não encontrada */
      404: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErroSaida'];
        };
      };
      /** @description The request does not satisfy the published contract or a domain rule. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorOrValidationResponse'];
        };
      };
      /** @description The caller exceeded an applicable request limit. */
      429: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description Unexpected internal failure with no sensitive exception details. */
      500: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description A required dependency is temporarily unavailable. */
      503: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
    };
  };
  resolver_revisao_api_v1_revisao__revisao_id__resolver_post: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        /** @description Identificador numérico da revisão pertencente ao usuário. */
        revisao_id: number;
      };
      cookie?: never;
    };
    requestBody: {
      content: {
        'application/json': components['schemas']['ResolucaoNova'];
      };
    };
    responses: {
      /** @description Successful Response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ResolucaoSaida'];
        };
      };
      /** @description Missing, expired, or invalid bearer token. */
      401: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description Revisão não encontrada */
      404: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErroSaida'];
        };
      };
      /** @description Revisão ocupada ou inconsistente */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErroSaida'];
        };
      };
      /** @description The request body exceeds the server-wide streaming limit. */
      413: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          /** @example Content Too Large */
          'text/plain': string;
        };
      };
      /** @description Resolução inválida */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json':
            | components['schemas']['ErroSaida']
            | components['schemas']['ValidationErrorResponse'];
        };
      };
      /** @description The caller exceeded an applicable request limit. */
      429: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description Unexpected internal failure with no sensitive exception details. */
      500: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description A required dependency is temporarily unavailable. */
      503: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
    };
  };
  receber_export_api_v1_upload_post: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody: {
      content: {
        'multipart/form-data': {
          /** @description IDs de chats a aceitar dentro da exportação. */
          chat_filter?: number[];
          /** Format: binary */
          file: string;
        } & {
          [key: string]: string;
        };
      };
    };
    responses: {
      /** @description Successful Response */
      202: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['UploadAcceptedResponse'];
        };
      };
      /** @description Malformed multipart upload. */
      400: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description Missing, expired, or invalid bearer token. */
      401: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description The upload exceeds either the declared application limit (JSON) or the server-wide streaming limit (plain text). */
      413: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
          /** @example Content Too Large */
          'text/plain': string;
        };
      };
      /** @description The request does not satisfy the published contract or a domain rule. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorOrValidationResponse'];
        };
      };
      /** @description The caller exceeded an applicable request limit. */
      429: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description Unexpected internal failure with no sensitive exception details. */
      500: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description A required dependency is temporarily unavailable. */
      503: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
    };
  };
  consultar_upload_api_v1_upload__job_id__get: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        /** @description UUID público retornado quando o upload foi aceito. */
        job_id: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Successful Response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['UploadStatusResponse'];
        };
      };
      /** @description Missing, expired, or invalid bearer token. */
      401: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description Upload job not found. */
      404: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description The request does not satisfy the published contract or a domain rule. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorOrValidationResponse'];
        };
      };
      /** @description The caller exceeded an applicable request limit. */
      429: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description Unexpected internal failure with no sensitive exception details. */
      500: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description A required dependency is temporarily unavailable. */
      503: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
    };
  };
  receber_coleta_coleta_post: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody: {
      content: {
        'application/json': {
          apostas: components['schemas']['JsonValue'][];
          /** @description Metadado informativo enviado pela extensão; o servidor o ignora para ordenação e aceita clientes legados. */
          capturado_em?: components['schemas']['JsonValue'];
          casa: string;
          /** @constant */
          contrato: 1;
        } & {
          [key: string]: components['schemas']['JsonValue'];
        };
      };
    };
    responses: {
      /** @description Successful Response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['CollectionResponse'];
        };
      };
      /** @description Malformed collection payload. */
      400: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description Invalid collection token. */
      403: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description The request body exceeds the server-wide streaming limit. */
      413: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          /** @example Content Too Large */
          'text/plain': string;
        };
      };
      /** @description The collection rate or daily limit was exceeded. */
      429: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description Unexpected internal failure with no sensitive exception details. */
      500: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description The collection was saved but could not be queued. */
      503: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
    };
  };
  health_health_get: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Successful Response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['LivenessResponse'];
        };
      };
      /** @description Unexpected internal failure with no sensitive exception details. */
      500: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
    };
  };
  metrics_metrics_get: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Prometheus exposition document. */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'text/plain': string;
        };
      };
      /** @description Unexpected internal failure with no sensitive exception details. */
      500: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
    };
  };
  ready_ready_get: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Successful Response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ReadinessResponse'];
        };
      };
      /** @description Unexpected internal failure with no sensitive exception details. */
      500: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description One or more required dependencies are not ready. */
      503: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ReadinessResponse'];
        };
      };
    };
  };
}

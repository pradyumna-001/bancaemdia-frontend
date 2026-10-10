export interface paths {
  '/api/v1/admin/casas': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /**
     * Consultar catálogo administrativo
     * @description Leitura auditada com autorização explícita de operador e RLS.
     */
    get: operations['coverage_api_v1_admin_casas_get'];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/api/v1/admin/casas/export': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /**
     * Exportar catálogo administrativo
     * @description Exportação JSON auditada da campanha e matriz das 27 jurisdições.
     */
    get: operations['coverage_api_v1_admin_casas_export_get'];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
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
  '/api/v1/billing/cancel': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /**
     * Cancel renewal
     * @description Idempotently schedule cancellation while preserving the remainder of the trial or paid period.
     */
    post: operations['billing_cancel_api_v1_billing_cancel_post'];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/api/v1/billing/portal': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /**
     * Manage subscription
     * @description Open the authenticated customer's Stripe portal with no plan changes and cancellation at period end.
     */
    post: operations['billing_portal_api_v1_billing_portal_post'];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/api/v1/billing/status': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /**
     * Subscription status
     * @description Read server access, card-confirmed trial bounds and configured prices; redirects never grant access.
     */
    get: operations['billing_status_api_v1_billing_status_get'];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/api/v1/billing/subscribe': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /**
     * Start hosted Checkout
     * @description Create or resume one durable Stripe test Checkout. Card confirmation starts one seven-day trial. No commercial default price.
     */
    post: operations['billing_subscribe_api_v1_billing_subscribe_post'];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/api/v1/billing/webhook': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /**
     * Receive Stripe events
     * @description Verify the raw body signature and persist a minimal deduplicated test-mode inbox; worker fetches current state.
     */
    post: operations['stripe_webhook_api_v1_billing_webhook_post'];
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
  '/api/v1/calculadoras/cobertura-ao-vivo': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /**
     * Calcular cobertura ao vivo
     * @description Mercado binário com stakes em dinheiro. Calcula a cobertura que equaliza o lucro dos dois desfechos; a comissão incide sobre o lucro da aposta vencedora. Sem freebet, cashout parcial ou push asiático.
     */
    post: operations['hedge_api_v1_calculadoras_cobertura_ao_vivo_post'];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/api/v1/calculadoras/distribuir-entre-resultados': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /**
     * Distribuir entre resultados
     * @description Equaliza retornos, expõe lucro ou perda após arredondamento em cada resultado e identifica arbitragem quando todos são lucrativos.
     */
    post: operations['distribute_api_v1_calculadoras_distribuir_entre_resultados_post'];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/api/v1/calculadoras/mercado-justo': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /**
     * Normalizar mercado justo
     * @description Normaliza proporcionalmente um mercado completo; os resultados devem ser mutuamente exclusivos e completos. Odds não comprovam completude nem probabilidade verdadeira.
     */
    post: operations['fair_api_v1_calculadoras_mercado_justo_post'];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/api/v1/calculadoras/percentual-banca': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /**
     * Calcular percentual da banca
     * @description Converte percentual em stake ou stake em percentual, com banca fornecida na requisição.
     */
    post: operations['bankroll_api_v1_calculadoras_percentual_banca_post'];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/api/v1/catalogo/candidatos': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /**
     * Confirmar acesso a domínio exato
     * @description Registra confirmação de acesso do usuário, sem afirmar autorização ou suporte técnico.
     */
    post: operations['candidate_api_v1_catalogo_candidatos_post'];
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
  '/api/v1/coleta/batches': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /**
     * Receber lote v2
     * @description Persiste um ACK estável por item antes de responder; resultado financeiro é consultado pelo job.
     */
    post: operations['receive_batch_api_v1_coleta_batches_post'];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/api/v1/coleta/catalogo': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /**
     * Consultar catálogo assinado
     * @description Projeção técnica autenticada pela instalação, sem evidência regulatória ou permissões de navegador.
     */
    get: operations['catalog_api_v1_coleta_catalogo_get'];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/api/v1/coleta/contract': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /**
     * Consultar versão do contrato
     * @description Publica N/N-1, hashes, faixa de protocolo e política de depreciação.
     */
    get: operations['published_release_api_v1_coleta_contract_get'];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/api/v1/coleta/contract/schema': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /**
     * Baixar contrato canônico
     * @description OpenAPI canônico gerado dos mesmos modelos usados pela API.
     */
    get: operations['published_schema_api_v1_coleta_contract_schema_get'];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/api/v1/coleta/installations': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /**
     * Listar instalações
     * @description Lista somente instalações do usuário, sem hashes ou segredos.
     */
    get: operations['list_installations_api_v1_coleta_installations_get'];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/api/v1/coleta/installations/{instalacao_id}': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    post?: never;
    /**
     * Revogar instalação
     * @description Revoga somente a instalação selecionada. Novo pareamento permite reconexão.
     */
    delete: operations['revoke_api_v1_coleta_installations__instalacao_id__delete'];
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/api/v1/coleta/installations/{instalacao_id}/rotate': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /**
     * Rotacionar credencial
     * @description Invalida atomicamente o token anterior desta instalação.
     */
    post: operations['rotate_api_v1_coleta_installations__instalacao_id__rotate_post'];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/api/v1/coleta/jobs/{job_id}': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /**
     * Consultar entrega v2
     * @description Retorna estado terminal ou pendente, restrito à instalação dona da captura.
     */
    get: operations['job_status_api_v1_coleta_jobs__job_id__get'];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/api/v1/coleta/pairing-codes': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /**
     * Criar código de pareamento
     * @description Emite código descartável para uma instalação; requer JWT e HTTPS.
     */
    post: operations['issue_code_api_v1_coleta_pairing_codes_post'];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/api/v1/coleta/pairing-exchange': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /**
     * Parear instalação
     * @description Troca código uma única vez por credencial restrita; requer HTTPS, sem Bearer.
     */
    post: operations['exchange_code_api_v1_coleta_pairing_exchange_post'];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/api/v1/coleta/sessions': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /**
     * Abrir ou retomar sessão
     * @description Cria uma fronteira imutável por instalação ou retoma o UUID explícito sem ampliar o corte.
     */
    post: operations['open_session_api_v1_coleta_sessions_post'];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/api/v1/coleta/sessions/{sessao_id}': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /**
     * Consultar sessão
     * @description Consulta somente sessão da instalação autenticada no primário.
     */
    get: operations['read_session_api_v1_coleta_sessions__sessao_id__get'];
    put?: never;
    post?: never;
    /**
     * Encerrar sessão
     * @description Impede novas capturas sem perder entregas já aceitas.
     */
    delete: operations['close_session_api_v1_coleta_sessions__sessao_id__delete'];
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/api/v1/coleta/status': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /**
     * Consultar credencial da instalação
     * @description Autentica X-Coleta-Token no primário e retorna somente a identidade validada.
     */
    get: operations['installation_status_api_v1_coleta_status_get'];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/api/v1/consolidacoes': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /**
     * Consolidar fontes após revisão
     * @description Vincula Casa e Telegram em uma transação: Casa fornece as finanças e Telegram preserva o contexto. Revalida usuário, conta e disponibilidade das fontes.
     */
    post: operations['consolidar_revisada_api_v1_consolidacoes_post'];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/api/v1/consolidacoes/{relacao_id}/desvincular': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /**
     * Desvincular fontes após revisão
     * @description Desfaz a relação financeira sem apagar fontes ou decisões anteriores. Exige motivo e impede nova consolidação automática do mesmo par.
     */
    post: operations['desvincular_revisada_api_v1_consolidacoes__relacao_id__desvincular_post'];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/api/v1/integrations/telegram/webhook': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /**
     * Receber atualização do bot Telegram
     * @description Valida o segredo do webhook e persiste o update_id antes de responder; o processamento é assíncrono.
     */
    post: operations['telegram_webhook_api_v1_integrations_telegram_webhook_post'];
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
  '/api/v1/painel/analises': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /**
     * Consultar análises adicionais
     * @description Recorta as contribuições canônicas por odds, horário, esporte, stake e banca.
     */
    get: operations['consultar_analises_api_v1_painel_analises_get'];
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
  '/api/v1/painel/metas': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /**
     * Listar metas de desempenho
     * @description Retorna as metas privadas com progresso calculado sobre apostas incluídas.
     */
    get: operations['listar_metas_api_v1_painel_metas_get'];
    put?: never;
    /**
     * Criar meta de desempenho
     * @description Cria uma meta privada para uma métrica canônica e um intervalo civil.
     */
    post: operations['criar_meta_api_v1_painel_metas_post'];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/api/v1/painel/metas/{meta_id}': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /**
     * Consultar meta de desempenho
     * @description Retorna uma meta privada e seu progresso atual.
     */
    get: operations['ler_meta_api_v1_painel_metas__meta_id__get'];
    put?: never;
    post?: never;
    /**
     * Arquivar meta de desempenho
     * @description Arquiva a meta mantendo seu histórico e progresso consultáveis.
     */
    delete: operations['arquivar_meta_api_v1_painel_metas__meta_id__delete'];
    options?: never;
    head?: never;
    /**
     * Alterar meta de desempenho
     * @description Altera os parâmetros ou o estado de uma meta privada.
     */
    patch: operations['alterar_meta_api_v1_painel_metas__meta_id__patch'];
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
  '/api/v1/painel/preferencias': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /**
     * Consultar preferências do painel
     * @description Retorna o fuso IANA usado no mapa de horário das apostas.
     */
    get: operations['ler_preferencias_api_v1_painel_preferencias_get'];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    /**
     * Alterar preferências do painel
     * @description Configura o fuso IANA usado no mapa de horário das apostas.
     */
    patch: operations['alterar_preferencias_api_v1_painel_preferencias_patch'];
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
  '/api/v1/telegram/link': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /**
     * Consultar vínculo Telegram
     * @description Consulta o vínculo ativo da conta sem expor identificadores do Telegram.
     */
    get: operations['consultar_vinculo_api_v1_telegram_link_get'];
    put?: never;
    post?: never;
    /**
     * Revogar vínculo Telegram
     * @description Revoga o vínculo ativo para impedir novo ingresso desta identidade.
     */
    delete: operations['revogar_vinculo_api_v1_telegram_link_delete'];
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/api/v1/telegram/link-codes': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /**
     * Emitir código de vínculo Telegram
     * @description Invalida códigos anteriores e retorna um código de oito caracteres válido por 30 minutos uma única vez.
     */
    post: operations['criar_codigo_api_v1_telegram_link_codes_post'];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/api/v1/titulares': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /**
     * Listar titulares
     * @description Lista titulares do usuário com busca e paginação.
     */
    get: operations['listar_titulares_api_v1_titulares_get'];
    put?: never;
    /**
     * Criar titular
     * @description Cria um titular pertencente ao usuário autenticado.
     */
    post: operations['criar_titular_api_v1_titulares_post'];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/api/v1/titulares/casas/{casa_id}/matriz': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /**
     * Consultar titulares por casa
     * @description Lista contas, estados e histórico de uso nesta casa; inclui titulares sem conta.
     */
    get: operations['matriz_casa_api_v1_titulares_casas__casa_id__matriz_get'];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/api/v1/titulares/financeiro': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /**
     * Consultar financeiro por titular e conta
     * @description Concilia apostas por conta, titular e usuário em centavos; mantém caixa e não atribuídas separados.
     */
    get: operations['consultar_financeiro_api_v1_titulares_financeiro_get'];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/api/v1/titulares/trocas': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /**
     * Trocar conta da casa
     * @description Aplica uma prévia feita com a mesma chave; fecha a origem e abre o destino no instante escolhido.
     */
    post: operations['aplicar_troca_api_v1_titulares_trocas_post'];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/api/v1/titulares/trocas/preview': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /**
     * Prévia de troca de conta
     * @description Mostra as apostas cuja atribuição difere após a troca, sem alterar as contas.
     */
    post: operations['preview_troca_api_v1_titulares_trocas_preview_post'];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/api/v1/titulares/{titular_id}': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /**
     * Consultar titular
     * @description Retorna um titular pertencente ao usuário.
     */
    get: operations['obter_titular_api_v1_titulares__titular_id__get'];
    put?: never;
    post?: never;
    /**
     * Arquivar titular
     * @description Arquiva um titular que não tenha conta em uso.
     */
    delete: operations['arquivar_titular_api_v1_titulares__titular_id__delete'];
    options?: never;
    head?: never;
    /**
     * Editar titular
     * @description Atualiza o nome de um titular ativo.
     */
    patch: operations['editar_titular_api_v1_titulares__titular_id__patch'];
    trace?: never;
  };
  '/api/v1/titulares/{titular_id}/contas': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /**
     * Criar conta da casa
     * @description Cria uma conta estável da casa para o titular.
     */
    post: operations['criar_conta_titular_api_v1_titulares__titular_id__contas_post'];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/api/v1/titulares/{titular_id}/contas/{conta_id}': {
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
     * Editar conta da casa
     * @description Altera apelido ou estado de uma conta fora de uso.
     */
    patch: operations['editar_conta_titular_api_v1_titulares__titular_id__contas__conta_id__patch'];
    trace?: never;
  };
  '/api/v1/titulares/{titular_id}/contas/{conta_id}/ativar': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /**
     * Ativar primeira conta da casa
     * @description Abre o primeiro intervalo de uso no instante atual quando a casa está livre.
     */
    post: operations['ativar_conta_titular_api_v1_titulares__titular_id__contas__conta_id__ativar_post'];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/api/v1/titulares/{titular_id}/matriz': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /**
     * Consultar casas do titular
     * @description Lista contas estáveis, intervalos de uso e ações disponíveis do titular.
     */
    get: operations['matriz_titular_api_v1_titulares__titular_id__matriz_get'];
    put?: never;
    post?: never;
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
  '/api/v1/usuario/me': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    post?: never;
    /**
     * Desativar e anonimizar minha conta
     * @description Remove registros vinculados e desativa a conta; dados brutos sem dono exclusivo exigem atendimento separado.
     */
    delete: operations['anonimizar_minha_conta_api_v1_usuario_me_delete'];
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/api/v1/usuario/me/export': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /**
     * Exportar meus registros
     * @description Baixa perfil e registros vinculados à conta em JSON ou Excel, sem arquivos binários.
     */
    get: operations['exportar_meus_dados_api_v1_usuario_me_export_get'];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/auth/callback': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /**
     * Concluir identidade verificada
     * @description Valida identidade e e-mail confirmado, vincula (issuer, sub) ao usuário interno e cria sessão HttpOnly; redireciona somente ao destino interno armazenado.
     */
    get: operations['callback_auth_callback_get'];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/auth/jwks': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /**
     * Consultar chaves públicas
     * @description Publica somente chaves RSA públicas; segredos de assinatura e criptografia permanecem no servidor.
     */
    get: operations['jwks_auth_jwks_get'];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/auth/logout': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /**
     * Revogar sessão
     * @description Exige cookie, Origin exata e X-CSRF-Token; revoga imediatamente acesso local, incluindo JWT emitido, e persiste revogação do refresh externo para tentativas posteriores.
     */
    post: operations['logout_auth_logout_post'];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/auth/refresh': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /**
     * Renovar sessão
     * @description Exige cookie, Origin exata e X-CSRF-Token; renova no emissor e rotaciona cookie e geração. Reuso de cookie retirado revoga a família. Serialize renovação.
     */
    post: operations['refresh_auth_refresh_post'];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/auth/session': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /**
     * Consultar sessão
     * @description Retorna identidade, versão e prova CSRF, sem tokens. Sessão ainda válida pode exigir renovação do acesso.
     */
    get: operations['session_status_auth_session_get'];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/auth/start': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /**
     * Iniciar login hospedado
     * @description Inicia Authorization Code + S256 PKCE com state de uso único e nonce; cadastro, confirmação de e-mail e recuperação usam a interface real do emissor.
     */
    get: operations['start_auth_start_get'];
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
    /** AnalisesSaida */
    AnalisesSaida: {
      /** Atualizado Em */
      atualizado_em: string | null;
      /** Faixas Odds */
      faixas_odds: components['schemas']['BucketAnaliseSaida'][];
      /**
       * Fonte Dados
       * @constant
       */
      fonte_dados: 'visao_canonica_ao_vivo';
      /** Fuso Horario */
      fuso_horario: string;
      /** Heatmap */
      heatmap: components['schemas']['BucketAnaliseSaida'][];
      /** Idade Mv Segundos */
      idade_mv_segundos: string | null;
      /** Odd Media */
      odd_media: string | null;
      /** Odds Desconhecidas */
      odds_desconhecidas: number;
      /** Odds Nao Aplicaveis */
      odds_nao_aplicaveis: number;
      /** Por Banca Progressao */
      por_banca_progressao: components['schemas']['BucketAnaliseSaida'][];
      /** Por Esporte */
      por_esporte: components['schemas']['BucketAnaliseSaida'][];
      /** Profit Factor */
      profit_factor: string | null;
      /** Quartis Stake */
      quartis_stake: components['schemas']['BucketAnaliseSaida'][];
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
      total_filtrado: components['schemas']['ResumoAnaliseSaida'];
    };
    /** AnonymizeResponse */
    AnonymizeResponse: {
      /**
       * Status
       * @constant
       */
      status: 'anonymized';
    };
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
      /** Conta Casa Id */
      conta_casa_id?: number | null;
      /** Conta Casa Ref */
      conta_casa_ref?: number | null;
      data_aposta?: string | null;
      /** Data Jogo */
      data_jogo?: string | null;
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
    /** AuthFailure */
    AuthFailure: {
      /** Code */
      code: string;
      /** Detail */
      detail: string;
    };
    /** BankrollRequest */
    BankrollRequest: {
      /** Bankroll Centavos */
      bankroll_centavos: number;
      /** Percentage */
      percentage?: string | null;
      /** Stake Centavos */
      stake_centavos?: number | null;
    };
    /** BatchAck */
    BatchAck: {
      /**
       * Batch Id
       * Format: uuid
       */
      batch_id: string;
      /**
       * Contrato
       * @default 2
       * @constant
       */
      contrato: 2;
      /** Items */
      items: components['schemas']['SubmissionAck'][];
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
      /** Consolidacoes */
      consolidacoes?: {
        [key: string]: components['schemas']['JsonValue'];
      }[];
      /** Eventos */
      eventos: components['schemas']['BetEventResponse'][];
      /**
       * Fonte Contextual
       * @default false
       */
      fonte_contextual: boolean;
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
      /**
       * Conta Atribuicao
       * @default UNASSIGNED
       * @enum {string}
       */
      conta_atribuicao: 'ASSIGNED' | 'UNASSIGNED';
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
    /**
     * BillingFrequency
     * @enum {string}
     */
    BillingFrequency: 'MONTHLY' | 'YEARLY';
    /** BillingStatusResponse */
    BillingStatusResponse: {
      /**
       * Access
       * @enum {string}
       */
      access: 'FULL_WRITE' | 'READ_ONLY';
      /** Can Manage */
      can_manage: boolean;
      /** Cancel At Period End */
      cancel_at_period_end: boolean;
      /** Card Required */
      card_required: boolean;
      /** Checkout Available */
      checkout_available: boolean;
      /** Current Period Ends At */
      current_period_ends_at: string | null;
      /** Price Id */
      price_id: number | null;
      /** Prices */
      prices: components['schemas']['PublicPrice'][];
      /** Status */
      status:
        | (
            | 'AWAITING_CARD'
            | 'TRIALING'
            | 'ACTIVE'
            | 'PAST_DUE'
            | 'CANCELED'
            | 'EXPIRED'
          )
        | null;
      /** Trial Confirmed */
      trial_confirmed: boolean;
      /** Trial Ends At */
      trial_ends_at: string | null;
      /** Trial Started At */
      trial_started_at: string | null;
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
    /** BucketAnaliseSaida */
    BucketAnaliseSaida: {
      /** Base Roi Centavos */
      base_roi_centavos: number;
      /** Capital Banca Centavos */
      capital_banca_centavos?: number | null;
      /** Chave */
      chave: string;
      /** Giro Centavos */
      giro_centavos: number;
      /** Greens */
      greens: number;
      /** Hit Rate */
      hit_rate: string | null;
      /** Lucro Centavos */
      lucro_centavos: number;
      /** Motivo Progressao */
      motivo_progressao?: string | null;
      /** Nome */
      nome?: string | null;
      /** Pendentes */
      pendentes: number;
      /** Progressao */
      progressao?: string | null;
      /** Reds */
      reds: number;
      /** Resultado Nao Aplicavel */
      resultado_nao_aplicavel: number;
      /** Roi */
      roi: string;
      /** Total Apostas */
      total_apostas: number;
      /** Valor Face Max Centavos */
      valor_face_max_centavos?: number | null;
      /** Valor Face Min Centavos */
      valor_face_min_centavos?: number | null;
    };
    /** CalculationResponse */
    CalculationResponse: {
      /** Assumptions */
      assumptions: string[];
      /** Data */
      data: {
        [key: string]: components['schemas']['JsonValue'];
      };
      /** Method */
      method: string;
      /** Precision */
      precision: string;
      /** Rounding */
      rounding: string;
      /** Warnings */
      warnings: string[];
    };
    /** Capture */
    Capture: {
      /**
       * Capturado Em
       * Format: date-time
       */
      capturado_em: string;
      /**
       * Client Event Id
       * Format: uuid
       */
      client_event_id: string;
      /** Conta Casa Ref */
      conta_casa_ref?: number | null;
      /** Content Hash */
      content_hash: string;
      /** Hostname */
      hostname: string;
      observado: components['schemas']['ObservedTransport'];
      /** Payload */
      payload: {
        [key: string]: components['schemas']['JsonValue'];
      };
    };
    /** CatalogEntry */
    CatalogEntry: {
      /** Adapter */
      adapter?: string | null;
      /** Adapter Version */
      adapter_version?: string | null;
      /** Aliases */
      aliases?: string[];
      /** Brand */
      brand: string;
      /** Capture Evidence Sha256 */
      capture_evidence_sha256?: string | null;
      /** Hostname */
      hostname: string;
      /**
       * Minimum Client Version
       * @default 1.0.0
       */
      minimum_client_version: string;
      /** Redirect Chain */
      redirect_chain?: string[];
      /**
       * Rollout
       * @default disabled
       * @enum {string}
       */
      rollout: 'disabled' | 'canary' | 'enabled' | 'revoked';
      /**
       * Schema Version
       * @default 1
       */
      schema_version: number;
      /** @default nao_avaliado */
      support: components['schemas']['Support'];
    };
    /** CatalogEnvelope */
    CatalogEnvelope: {
      payload: components['schemas']['CatalogPayload'];
      /** Signature */
      signature: string;
    };
    /** CatalogPayload */
    CatalogPayload: {
      /**
       * Algorithm
       * @constant
       */
      algorithm: 'Ed25519';
      /** Catalog Version */
      catalog_version: number;
      /**
       * Contract Version
       * @constant
       */
      contract_version: 1;
      /** Entries */
      entries: components['schemas']['CatalogEntry'][];
      /** Environment */
      environment: string;
      /**
       * Expires At
       * Format: date-time
       */
      expires_at: string;
      /**
       * Issued At
       * Format: date-time
       */
      issued_at: string;
      /** Key Id */
      key_id: string;
      last_known_good: components['schemas']['LastKnownGood'];
      /** Minimum Client Version */
      minimum_client_version: string;
      trust_roots: components['schemas']['TrustRoots'];
    };
    /** CollectionBatch */
    CollectionBatch: {
      /**
       * Batch Id
       * Format: uuid
       */
      batch_id: string;
      /**
       * Contrato
       * @constant
       */
      contrato: 2;
      /** Items */
      items: components['schemas']['Capture'][];
      /**
       * Sessao Id
       * Format: uuid
       */
      sessao_id: string;
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
    /** CollectionRelease */
    CollectionRelease: {
      /** Artifact */
      artifact: string;
      /** Artifact Sha256 */
      artifact_sha256: string;
      /** Client Protocol Max */
      client_protocol_max: number;
      /** Client Protocol Min */
      client_protocol_min: number;
      /** Current Contract */
      current_contract: number;
      /** Deprecation Date */
      deprecation_date: string | null;
      /** Minimum Deprecation Days */
      minimum_deprecation_days: number;
      /** Schema Sha256 */
      schema_sha256: string;
      /** Supported Contracts */
      supported_contracts: number[];
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
    /** ConsolidacaoPedido */
    ConsolidacaoPedido: {
      /** Casa Aposta Id */
      casa_aposta_id: number;
      /** Telegram Aposta Id */
      telegram_aposta_id: number;
      /** Tipster Choice */
      tipster_choice?: ('casa' | 'telegram') | null;
    };
    /** ConsolidacaoResposta */
    ConsolidacaoResposta: {
      /** Casa Aposta Id */
      casa_aposta_id: number;
      /** Contexto */
      contexto: {
        [key: string]: components['schemas']['JsonValue'];
      };
      /** Decisao */
      decisao: string;
      /** Estado */
      estado: string;
      /** Evidencia */
      evidencia: {
        [key: string]: components['schemas']['JsonValue'];
      };
      /** Id */
      id: number;
      /** Telegram Aposta Id */
      telegram_aposta_id: number;
    };
    /** ContaEdicao */
    ContaEdicao: {
      /** Apelido */
      apelido?: string | null;
      /** Estado */
      estado?: ('DISPONIVEL' | 'LIMITADA' | 'ENCERRADA') | null;
    };
    /** ContaEntrada */
    ContaEntrada: {
      /** Apelido */
      apelido: string;
      /** Casa Id */
      casa_id: number;
    };
    /** ContaFinanceiraSaida */
    ContaFinanceiraSaida: {
      /** Apelido */
      apelido: string;
      /** Casa Id */
      casa_id: number;
      /** Casa Nome */
      casa_nome: string;
      /** Conta Casa Id */
      conta_casa_id: number;
      /** Metricas */
      metricas: {
        [key: string]: number | string;
      };
      /** Saldo Atual Centavos */
      saldo_atual_centavos: number | null;
      /** Titular Id */
      titular_id: number | null;
    };
    /** ContaMatrizSaida */
    ContaMatrizSaida: {
      /** Acoes Validas */
      acoes_validas: ('ATIVAR' | 'TROCAR_PARA' | 'TROCAR_DE' | 'EDITAR')[];
      /** Apelido */
      apelido: string;
      /** Ativa */
      ativa: boolean;
      /** Casa Id */
      casa_id: number;
      /** Casa Nome */
      casa_nome: string;
      /** Conta Casa Id */
      conta_casa_id: number;
      /**
       * Estado
       * @enum {string}
       */
      estado: 'DISPONIVEL' | 'EM_USO' | 'LIMITADA' | 'ENCERRADA';
      /** Historico Uso */
      historico_uso: components['schemas']['IntervaloSaida'][];
      intervalo_ativo: components['schemas']['IntervaloSaida'] | null;
      /** Titular Id */
      titular_id: number | null;
      /** Titular Nome */
      titular_nome: string | null;
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
    /** DesvinculacaoPedido */
    DesvinculacaoPedido: {
      /** Motivo */
      motivo: string;
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
      /**
       * Depositos Acumulados Centavos
       * @default 0
       */
      depositos_acumulados_centavos: number;
      /**
       * Depositos Periodo Centavos
       * @default 0
       */
      depositos_periodo_centavos: number;
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
      /** Saldo Inicial Centavos */
      saldo_inicial_centavos?: number | null;
      /**
       * Saques Acumulados Centavos
       * @default 0
       */
      saques_acumulados_centavos: number;
      /**
       * Saques Periodo Centavos
       * @default 0
       */
      saques_periodo_centavos: number;
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
    /** FinanceiroSaida */
    FinanceiroSaida: {
      /** Contas Sem Titular */
      contas_sem_titular: components['schemas']['ContaFinanceiraSaida'][];
      /** Nao Atribuidas */
      nao_atribuidas: {
        [key: string]: number | string;
      };
      /**
       * Nao Atribuidas Status
       * @constant
       */
      nao_atribuidas_status: 'UNASSIGNED';
      /** Saldo Atual Centavos */
      saldo_atual_centavos: number | null;
      /** Titulares */
      titulares: components['schemas']['TitularFinanceiroSaida'][];
      /** Total */
      total: {
        [key: string]: number | string;
      };
    };
    /** FusoEntrada */
    FusoEntrada: {
      /** Fuso Horario */
      fuso_horario: string;
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
    /** HTTPValidationError */
    HTTPValidationError: {
      /** Detail */
      detail?: components['schemas']['ValidationError'][];
    };
    /** HedgeRequest */
    HedgeRequest: {
      /**
       * Commission Percentage
       * @default 0
       */
      commission_percentage: string;
      /**
       * Market Type
       * @default two_way
       * @constant
       */
      market_type: 'two_way';
      /** Opposing Odd */
      opposing_odd: string;
      /** Original Odd */
      original_odd: string;
      /** Original Stake Centavos */
      original_stake_centavos: number;
      /**
       * Stake Type
       * @default cash
       * @constant
       */
      stake_type: 'cash';
    };
    /** HostedResponse */
    HostedResponse: {
      /** Url */
      url: string;
    };
    /** InstallationResponse */
    InstallationResponse: {
      /**
       * Criado Em
       * Format: date-time
       */
      criado_em: string;
      /** Expira Em */
      expira_em: string | null;
      /** Id */
      id: number;
      /**
       * Instalacao Publica Id
       * Format: uuid
       */
      instalacao_publica_id: string;
      /** Nome Dispositivo */
      nome_dispositivo: string | null;
      /** Pareado Em */
      pareado_em: string | null;
      /** Revogado Em */
      revogado_em: string | null;
      /** Rotacionado Em */
      rotacionado_em: string | null;
      /** Token Prefixo */
      token_prefixo: string | null;
      /** Ultimo Uso Em */
      ultimo_uso_em: string | null;
    };
    /** InstallationStatusResponse */
    InstallationStatusResponse: {
      /** Instalacao Id */
      instalacao_id: number;
      /** Usuario Id */
      usuario_id: number;
    };
    /** InstallationTokenResponse */
    InstallationTokenResponse: {
      /** Instalacao Id */
      instalacao_id: number;
      /** Token */
      token: string;
    };
    /** IntervaloSaida */
    IntervaloSaida: {
      /**
       * Origem
       * @enum {string}
       */
      origem: 'LEGADO' | 'EXPLICITA';
      /** Vigente Ate */
      vigente_ate: string | null;
      /** Vigente De */
      vigente_de: string | null;
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
    /** JobStatus */
    JobStatus: {
      /** Aposta Chave */
      aposta_chave: string | null;
      /**
       * Client Event Id
       * Format: uuid
       */
      client_event_id: string;
      /**
       * Job Id
       * Format: uuid
       */
      job_id: string;
      /** Reason */
      reason: string;
      /**
       * Status
       * @enum {string}
       */
      status:
        | 'pending'
        | 'materialized'
        | 'updated'
        | 'ignored_before_boundary'
        | 'needs_review'
        | 'failed'
        | 'duplicate';
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
    /** LastKnownGood */
    LastKnownGood: {
      /**
       * Maximum Age Seconds
       * @constant
       */
      maximum_age_seconds: 86400;
      /**
       * New Hosts Allowed
       * @constant
       */
      new_hosts_allowed: false;
      /**
       * Requires Previously Verified Signature
       * @constant
       */
      requires_previously_verified_signature: true;
      /**
       * Revoked Hosts Allowed
       * @constant
       */
      revoked_hosts_allowed: false;
    };
    /** LinkCodeResponse */
    LinkCodeResponse: {
      /** Code */
      code: string;
      /**
       * Expires At
       * Format: date-time
       */
      expires_at: string;
    };
    /** LinkStatusResponse */
    LinkStatusResponse: {
      /** Last Inbound At */
      last_inbound_at: string | null;
      /** Last Outbound At */
      last_outbound_at: string | null;
      /** Linked */
      linked: boolean;
      /** Linked At */
      linked_at: string | null;
    };
    /** LivenessResponse */
    LivenessResponse: {
      /**
       * Status
       * @constant
       */
      status: 'ok';
    };
    /** LogoutStatus */
    LogoutStatus: {
      /** Logged Out */
      logged_out: boolean;
    };
    /** ManualCandidate */
    ManualCandidate: {
      /** Access Confirmed */
      access_confirmed: boolean;
      /** Brand */
      brand: string;
      /**
       * Confirmed At
       * Format: date-time
       */
      confirmed_at: string;
      /** Evidence Sha256 */
      evidence_sha256: string;
      /** Hostname */
      hostname: string;
    };
    /** ManualReceipt */
    ManualReceipt: {
      /** Brand */
      brand: string;
      /** Hostname */
      hostname: string;
      /**
       * Situation
       * @default acesso_confirmado
       */
      situation: string;
    };
    /** MarketRequest */
    MarketRequest: {
      /**
       * Outcomes
       * @description Supply every mutually exclusive outcome. Odds alone cannot prove completeness.
       */
      outcomes: components['schemas']['Outcome'][];
    };
    /** MatrizCasaSaida */
    MatrizCasaSaida: {
      /** Casa Id */
      casa_id: number;
      /** Casa Nome */
      casa_nome: string;
      /** Contas */
      contas: components['schemas']['ContaMatrizSaida'][];
      /**
       * Proxima Acao Sem Conta
       * @constant
       */
      proxima_acao_sem_conta: 'CRIAR_CONTA';
      /** Titulares Sem Conta */
      titulares_sem_conta: components['schemas']['TitularSaida'][];
    };
    /** MatrizTitularSaida */
    MatrizTitularSaida: {
      /** Contas */
      contas: components['schemas']['ContaMatrizSaida'][];
      titular: components['schemas']['TitularSaida'];
    };
    /** MetaAlteracao */
    MetaAlteracao: {
      /** Alvo */
      alvo?: number | string | null;
      /** Fim */
      fim?: string | null;
      /** Inicio */
      inicio?: string | null;
      /** Linha Base */
      linha_base?: number | string | null;
      /** Metrica */
      metrica?:
        | (
            | 'lucro_centavos'
            | 'giro_centavos'
            | 'roi'
            | 'win_rate'
            | 'total_apostas'
          )
        | null;
      /** Status */
      status?: ('ativa' | 'concluida' | 'arquivada') | null;
      /** Titulo */
      titulo?: string | null;
    };
    /** MetaEntrada */
    MetaEntrada: {
      /** Alvo */
      alvo: number | string;
      /**
       * Fim
       * Format: date
       */
      fim: string;
      /**
       * Inicio
       * Format: date
       */
      inicio: string;
      /**
       * Linha Base
       * @default 0
       */
      linha_base: number | string;
      /**
       * Metrica
       * @enum {string}
       */
      metrica:
        | 'lucro_centavos'
        | 'giro_centavos'
        | 'roi'
        | 'win_rate'
        | 'total_apostas';
      /** Titulo */
      titulo: string;
    };
    /** MetaSaida */
    MetaSaida: {
      /** Alvo */
      alvo: string;
      /** Alvo Atingido */
      alvo_atingido: boolean;
      /**
       * Fim
       * Format: date
       */
      fim: string;
      /** Id */
      id: number;
      /**
       * Inicio
       * Format: date
       */
      inicio: string;
      /** Linha Base */
      linha_base: string;
      /**
       * Metrica
       * @enum {string}
       */
      metrica:
        | 'lucro_centavos'
        | 'giro_centavos'
        | 'roi'
        | 'win_rate'
        | 'total_apostas';
      /** Progresso */
      progresso: string | null;
      /**
       * Status
       * @enum {string}
       */
      status: 'ativa' | 'concluida' | 'arquivada';
      /** Titulo */
      titulo: string;
      /** Valor Atual */
      valor_atual: string;
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
    /** ObservedTransport */
    ObservedTransport: {
      /** Adapter Version */
      adapter_version: string;
      /**
       * Content Type
       * @constant
       */
      content_type: 'application/json';
      /**
       * Method
       * @enum {string}
       */
      method: 'GET' | 'POST';
      /** Path */
      path: string;
      /**
       * Sanitization Version
       * @constant
       */
      sanitization_version: 1;
      /**
       * Source
       * @constant
       */
      source: 'observed_response';
      /**
       * Status
       * @constant
       */
      status: 200;
      /**
       * Transport
       * @enum {string}
       */
      transport: 'fetch' | 'xhr';
    };
    /** Outcome */
    Outcome: {
      /** Name */
      name: string;
      /** Odd */
      odd: string;
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
    /** PairingCodeResponse */
    PairingCodeResponse: {
      /** Codigo */
      codigo: string;
      /**
       * Expira Em
       * Format: date-time
       */
      expira_em: string;
    };
    /** PairingExchange */
    PairingExchange: {
      /**
       * Codigo
       * Format: password
       */
      codigo: string;
      /**
       * Instalacao Publica Id
       * Format: uuid
       */
      instalacao_publica_id: string;
      /** Nome Dispositivo */
      nome_dispositivo?: string | null;
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
    /** PublicKey */
    PublicKey: {
      /**
       * Alg
       * @constant
       */
      alg: 'RS256';
      /** E */
      e: string;
      /** Key Ops */
      key_ops: 'verify'[];
      /** Kid */
      kid: string;
      /**
       * Kty
       * @constant
       */
      kty: 'RSA';
      /** N */
      n: string;
      /**
       * Use
       * @constant
       */
      use: 'sig';
    };
    /** PublicKeys */
    PublicKeys: {
      /** Keys */
      keys: components['schemas']['PublicKey'][];
    };
    /** PublicPrice */
    PublicPrice: {
      /** Amount Minor */
      amount_minor: number;
      /** Currency */
      currency: string;
      frequency: components['schemas']['BillingFrequency'];
      /** Id */
      id: number;
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
    /** ResumoAnaliseSaida */
    ResumoAnaliseSaida: {
      /** Base Roi Centavos */
      base_roi_centavos: number;
      /** Giro Centavos */
      giro_centavos: number;
      /** Greens */
      greens: number;
      /** Hit Rate */
      hit_rate: string | null;
      /** Lucro Centavos */
      lucro_centavos: number;
      /** Pendentes */
      pendentes: number;
      /** Reds */
      reds: number;
      /** Resultado Nao Aplicavel */
      resultado_nao_aplicavel: number;
      /** Roi */
      roi: string;
      /** Total Apostas */
      total_apostas: number;
    };
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
    /** RevocationResponse */
    RevocationResponse: {
      /** Revoked */
      revoked: boolean;
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
    /** SessionRequest */
    SessionRequest: {
      /**
       * Coletar Desde
       * Format: date-time
       */
      coletar_desde: string;
      /** Retomar Sessao Id */
      retomar_sessao_id?: string | null;
    };
    /** SessionResponse */
    SessionResponse: {
      /**
       * Coletar Desde
       * Format: date-time
       */
      coletar_desde: string;
      /** Encerrada Em */
      encerrada_em: string | null;
      /**
       * Sessao Id
       * Format: uuid
       */
      sessao_id: string;
    };
    /** SessionStatus */
    SessionStatus: {
      /**
       * Access Expires At
       * Format: date-time
       */
      access_expires_at: string;
      /** Csrf Token */
      csrf_token: string;
      /** Email */
      email: string;
      /** Nome */
      nome: string;
      /** Refresh Required */
      refresh_required: boolean;
      /**
       * Session Expires At
       * Format: date-time
       */
      session_expires_at: string;
      /** Session Version */
      session_version: string;
      /** Usuario Id */
      usuario_id: number;
    };
    /** StakeMarketRequest */
    StakeMarketRequest: {
      /**
       * Outcomes
       * @description Supply every mutually exclusive outcome. Odds alone cannot prove completeness.
       */
      outcomes: components['schemas']['Outcome'][];
      /** Total Stake Centavos */
      total_stake_centavos: number;
    };
    /** SubmissionAck */
    SubmissionAck: {
      /**
       * Ack
       * @enum {string}
       */
      ack: 'accepted' | 'duplicate' | 'rejected';
      /**
       * Client Event Id
       * Format: uuid
       */
      client_event_id: string;
      /** Content Hash */
      content_hash: string;
      /** Job Id */
      job_id: string | null;
      /** Reason */
      reason: string;
      /** Retryable */
      retryable: boolean;
    };
    /** SubscribeRequest */
    SubscribeRequest: {
      /**
       * Currency
       * @default BRL
       */
      currency: string;
      /** @default MONTHLY */
      frequency: components['schemas']['BillingFrequency'];
    };
    /** @enum {string} */
    Support:
      | 'nao_avaliado'
      | 'precisa_captura'
      | 'em_desenvolvimento'
      | 'suportado'
      | 'bloqueado_externo'
      | 'regressao';
    /** TelegramWebhookAck */
    TelegramWebhookAck: {
      /** Accepted */
      accepted: boolean;
    };
    /**
     * TipoMovimentoConsulta
     * @enum {string}
     */
    TipoMovimentoConsulta:
      'DEPOSITO' | 'SAQUE' | 'TRANSFERENCIA' | 'BONUS' | 'AJUSTE';
    /** TitularEntrada */
    TitularEntrada: {
      /** Nome */
      nome: string;
    };
    /** TitularFinanceiroSaida */
    TitularFinanceiroSaida: {
      /** Contas */
      contas: components['schemas']['ContaFinanceiraSaida'][];
      /** Metricas */
      metricas: {
        [key: string]: number | string;
      };
      /** Nome */
      nome: string;
      /** Saldo Atual Centavos */
      saldo_atual_centavos: number | null;
      /** Titular Id */
      titular_id: number;
    };
    /** TitularSaida */
    TitularSaida: {
      /** Arquivado */
      arquivado: boolean;
      /**
       * Criado Em
       * Format: date-time
       */
      criado_em: string;
      /** Id */
      id: number;
      /** Nome */
      nome: string;
    };
    /** TitularesPaginaSaida */
    TitularesPaginaSaida: {
      /** Data */
      data: components['schemas']['TitularSaida'][];
      /** Page */
      page: number;
      /** Page Size */
      page_size: number;
      /** Total */
      total: number;
    };
    /** TrocaContaEntrada */
    TrocaContaEntrada: {
      /** Casa Id */
      casa_id: number;
      /** Conta Destino Id */
      conta_destino_id: number;
      /** Conta Origem Id */
      conta_origem_id: number;
      /**
       * Efetiva Em
       * Format: date-time
       */
      efetiva_em: string;
      /**
       * Estado Origem
       * @enum {string}
       */
      estado_origem: 'DISPONIVEL' | 'LIMITADA' | 'ENCERRADA';
    };
    /** TrocaContaSaida */
    TrocaContaSaida: {
      /** Aplicada */
      aplicada: boolean;
      /** Apostas Afetadas Ids */
      apostas_afetadas_ids: number[];
      /** Casa Id */
      casa_id: number;
      /** Conta Destino Id */
      conta_destino_id: number;
      /** Conta Origem Id */
      conta_origem_id: number;
      /**
       * Efetiva Em
       * Format: date-time
       */
      efetiva_em: string;
      /**
       * Estado Origem
       * @enum {string}
       */
      estado_origem: 'DISPONIVEL' | 'LIMITADA' | 'ENCERRADA';
    };
    /** TrustRoot */
    TrustRoot: {
      /**
       * Algorithm
       * @default Ed25519
       */
      algorithm: string;
      /** Key Id */
      key_id: string;
      /** Public Key */
      public_key: string;
    };
    /** TrustRoots */
    TrustRoots: {
      current: components['schemas']['TrustRoot'];
      next: components['schemas']['TrustRoot'] | null;
    };
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
    /** ValidationError */
    ValidationError: {
      /** Context */
      ctx?: Record<string, never>;
      /** Input */
      input?: unknown;
      /** Location */
      loc: (string | number)[];
      /** Message */
      msg: string;
      /** Error Type */
      type: string;
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
  coverage_api_v1_admin_casas_get: {
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
          'application/json': {
            [key: string]: components['schemas']['JsonValue'];
          };
        };
      };
      /** @description Exact host/access confirmation required. */
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
      /** @description account_read_only: writes require confirmed trial or paid access. */
      402: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description Explicit catalog operator authorization required. */
      403: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description Method not allowed */
      405: {
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
  coverage_api_v1_admin_casas_export_get: {
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
          'application/json': {
            [key: string]: components['schemas']['JsonValue'];
          };
        };
      };
      /** @description Exact host/access confirmation required. */
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
      /** @description account_read_only: writes require confirmed trial or paid access. */
      402: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description Explicit catalog operator authorization required. */
      403: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description Method not allowed */
      405: {
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
        /** @description Identificador do titular pertencente ao usuário. */
        titular_id?: number | null;
        /** @description Identificador da conta da casa usada como filtro. */
        conta_casa_id?: number | null;
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
          /** @description Identity error code when AUTH_ENABLED; legacy response body is preserved. */
          'X-Auth-Error'?: string;
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description account_read_only: writes require confirmed trial or paid access. */
      402: {
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
          /** @description Identity error code when AUTH_ENABLED; legacy response body is preserved. */
          'X-Auth-Error'?: string;
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
          /** @description Identity error code when AUTH_ENABLED; legacy response body is preserved. */
          'X-Auth-Error'?: string;
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description account_read_only: writes require confirmed trial or paid access. */
      402: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description Cookie mutation requires exact Origin and current CSRF proof. */
      403: {
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
      /** @description The request body exceeds this endpoint's streaming limit. */
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
          /** @description Identity error code when AUTH_ENABLED; legacy response body is preserved. */
          'X-Auth-Error'?: string;
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
          /** @description Identity error code when AUTH_ENABLED; legacy response body is preserved. */
          'X-Auth-Error'?: string;
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description account_read_only: writes require confirmed trial or paid access. */
      402: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description Cookie mutation requires exact Origin and current CSRF proof. */
      403: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description The request body exceeds this endpoint's streaming limit. */
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
          /** @description Identity error code when AUTH_ENABLED; legacy response body is preserved. */
          'X-Auth-Error'?: string;
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
          /** @description Identity error code when AUTH_ENABLED; legacy response body is preserved. */
          'X-Auth-Error'?: string;
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description account_read_only: writes require confirmed trial or paid access. */
      402: {
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
          /** @description Identity error code when AUTH_ENABLED; legacy response body is preserved. */
          'X-Auth-Error'?: string;
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
          /** @description Identity error code when AUTH_ENABLED; legacy response body is preserved. */
          'X-Auth-Error'?: string;
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description account_read_only: writes require confirmed trial or paid access. */
      402: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description Cookie mutation requires exact Origin and current CSRF proof. */
      403: {
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
          /** @description Identity error code when AUTH_ENABLED; legacy response body is preserved. */
          'X-Auth-Error'?: string;
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
          /** @description Identity error code when AUTH_ENABLED; legacy response body is preserved. */
          'X-Auth-Error'?: string;
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description account_read_only: writes require confirmed trial or paid access. */
      402: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description Cookie mutation requires exact Origin and current CSRF proof. */
      403: {
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
      /** @description The request body exceeds this endpoint's streaming limit. */
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
          /** @description Identity error code when AUTH_ENABLED; legacy response body is preserved. */
          'X-Auth-Error'?: string;
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
          /** @description Identity error code when AUTH_ENABLED; legacy response body is preserved. */
          'X-Auth-Error'?: string;
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description account_read_only: writes require confirmed trial or paid access. */
      402: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description Cookie mutation requires exact Origin and current CSRF proof. */
      403: {
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
          /** @description Identity error code when AUTH_ENABLED; legacy response body is preserved. */
          'X-Auth-Error'?: string;
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
          /** @description Identity error code when AUTH_ENABLED; legacy response body is preserved. */
          'X-Auth-Error'?: string;
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description account_read_only: writes require confirmed trial or paid access. */
      402: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description Cookie mutation requires exact Origin and current CSRF proof. */
      403: {
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
      /** @description The request body exceeds this endpoint's streaming limit. */
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
          /** @description Identity error code when AUTH_ENABLED; legacy response body is preserved. */
          'X-Auth-Error'?: string;
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
    };
  };
  billing_cancel_api_v1_billing_cancel_post: {
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
          'application/json': {
            [key: string]: string;
          };
        };
      };
      /** @description Missing, expired, or invalid bearer token. */
      401: {
        headers: {
          /** @description Identity error code when AUTH_ENABLED; legacy response body is preserved. */
          'X-Auth-Error'?: string;
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description account_read_only: writes require confirmed trial or paid access. */
      402: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description Cookie mutation requires exact Origin and current CSRF proof. */
      403: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description Billing configuration or current subscription prevents this action. */
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
          /** @description Identity error code when AUTH_ENABLED; legacy response body is preserved. */
          'X-Auth-Error'?: string;
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
    };
  };
  billing_portal_api_v1_billing_portal_post: {
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
          'application/json': components['schemas']['HostedResponse'];
        };
      };
      /** @description Missing, expired, or invalid bearer token. */
      401: {
        headers: {
          /** @description Identity error code when AUTH_ENABLED; legacy response body is preserved. */
          'X-Auth-Error'?: string;
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description account_read_only: writes require confirmed trial or paid access. */
      402: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description Cookie mutation requires exact Origin and current CSRF proof. */
      403: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description Billing configuration or current subscription prevents this action. */
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
          /** @description Identity error code when AUTH_ENABLED; legacy response body is preserved. */
          'X-Auth-Error'?: string;
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
    };
  };
  billing_status_api_v1_billing_status_get: {
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
          'application/json': components['schemas']['BillingStatusResponse'];
        };
      };
      /** @description Missing, expired, or invalid bearer token. */
      401: {
        headers: {
          /** @description Identity error code when AUTH_ENABLED; legacy response body is preserved. */
          'X-Auth-Error'?: string;
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description account_read_only: writes require confirmed trial or paid access. */
      402: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description Billing configuration or current subscription prevents this action. */
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
          /** @description Identity error code when AUTH_ENABLED; legacy response body is preserved. */
          'X-Auth-Error'?: string;
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
    };
  };
  billing_subscribe_api_v1_billing_subscribe_post: {
    parameters: {
      query?: never;
      header: {
        /** @description Chave opaca obrigatória do cliente; reutilizá-la com o mesmo corpo reproduz a resposta original sem repetir a operação. */
        'Idempotency-Key': string;
      };
      path?: never;
      cookie?: never;
    };
    requestBody: {
      content: {
        'application/json': components['schemas']['SubscribeRequest'];
      };
    };
    responses: {
      /** @description Successful Response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['HostedResponse'];
        };
      };
      /** @description Missing, expired, or invalid bearer token. */
      401: {
        headers: {
          /** @description Identity error code when AUTH_ENABLED; legacy response body is preserved. */
          'X-Auth-Error'?: string;
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description account_read_only: writes require confirmed trial or paid access. */
      402: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description Cookie mutation requires exact Origin and current CSRF proof. */
      403: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description Billing configuration or current subscription prevents this action. */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description The request body exceeds this endpoint's streaming limit. */
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
          /** @description Identity error code when AUTH_ENABLED; legacy response body is preserved. */
          'X-Auth-Error'?: string;
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
    };
  };
  stripe_webhook_api_v1_billing_webhook_post: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** @description Raw Stripe JSON bytes; signature verification precedes parsing. */
    requestBody: {
      content: {
        /**
         * @example {
         *       "data": {
         *         "object": {
         *           "customer": "cus_contract"
         *         }
         *       },
         *       "id": "evt_contract",
         *       "livemode": false,
         *       "type": "invoice.paid"
         *     }
         */
        'application/json': {
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
          'application/json': {
            [key: string]: string;
          };
        };
      };
      /** @description Invalid signature or event. */
      400: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description Event too large. */
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
      /** @description Webhook temporarily unavailable. */
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
        /** @description Identificador do titular pertencente ao usuário. */
        titular_id?: number | null;
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
          /** @description Identity error code when AUTH_ENABLED; legacy response body is preserved. */
          'X-Auth-Error'?: string;
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description account_read_only: writes require confirmed trial or paid access. */
      402: {
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
          /** @description Identity error code when AUTH_ENABLED; legacy response body is preserved. */
          'X-Auth-Error'?: string;
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
        /** @description Chave opaca obrigatória do cliente; reutilizá-la com o mesmo corpo reproduz a resposta original sem repetir a operação. */
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
          /** @description Identity error code when AUTH_ENABLED; legacy response body is preserved. */
          'X-Auth-Error'?: string;
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description account_read_only: writes require confirmed trial or paid access. */
      402: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description Cookie mutation requires exact Origin and current CSRF proof. */
      403: {
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
      /** @description The request body exceeds this endpoint's streaming limit. */
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
          /** @description Identity error code when AUTH_ENABLED; legacy response body is preserved. */
          'X-Auth-Error'?: string;
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
          /** @description Identity error code when AUTH_ENABLED; legacy response body is preserved. */
          'X-Auth-Error'?: string;
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description account_read_only: writes require confirmed trial or paid access. */
      402: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description Cookie mutation requires exact Origin and current CSRF proof. */
      403: {
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
      /** @description The request body exceeds this endpoint's streaming limit. */
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
          /** @description Identity error code when AUTH_ENABLED; legacy response body is preserved. */
          'X-Auth-Error'?: string;
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
          /** @description Identity error code when AUTH_ENABLED; legacy response body is preserved. */
          'X-Auth-Error'?: string;
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description account_read_only: writes require confirmed trial or paid access. */
      402: {
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
          /** @description Identity error code when AUTH_ENABLED; legacy response body is preserved. */
          'X-Auth-Error'?: string;
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
          /** @description Identity error code when AUTH_ENABLED; legacy response body is preserved. */
          'X-Auth-Error'?: string;
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description account_read_only: writes require confirmed trial or paid access. */
      402: {
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
          /** @description Identity error code when AUTH_ENABLED; legacy response body is preserved. */
          'X-Auth-Error'?: string;
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
    };
  };
  hedge_api_v1_calculadoras_cobertura_ao_vivo_post: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody: {
      content: {
        'application/json': components['schemas']['HedgeRequest'];
      };
    };
    responses: {
      /** @description Successful Response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['CalculationResponse'];
        };
      };
      /** @description Missing, expired, or invalid bearer token. */
      401: {
        headers: {
          /** @description Identity error code when AUTH_ENABLED; legacy response body is preserved. */
          'X-Auth-Error'?: string;
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description account_read_only: writes require confirmed trial or paid access. */
      402: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description Cookie mutation requires exact Origin and current CSRF proof. */
      403: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description The request body exceeds this endpoint's streaming limit. */
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
          /** @description Identity error code when AUTH_ENABLED; legacy response body is preserved. */
          'X-Auth-Error'?: string;
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
    };
  };
  distribute_api_v1_calculadoras_distribuir_entre_resultados_post: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody: {
      content: {
        'application/json': components['schemas']['StakeMarketRequest'];
      };
    };
    responses: {
      /** @description Successful Response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['CalculationResponse'];
        };
      };
      /** @description Missing, expired, or invalid bearer token. */
      401: {
        headers: {
          /** @description Identity error code when AUTH_ENABLED; legacy response body is preserved. */
          'X-Auth-Error'?: string;
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description account_read_only: writes require confirmed trial or paid access. */
      402: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description Cookie mutation requires exact Origin and current CSRF proof. */
      403: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description The request body exceeds this endpoint's streaming limit. */
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
          /** @description Identity error code when AUTH_ENABLED; legacy response body is preserved. */
          'X-Auth-Error'?: string;
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
    };
  };
  fair_api_v1_calculadoras_mercado_justo_post: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody: {
      content: {
        'application/json': components['schemas']['MarketRequest'];
      };
    };
    responses: {
      /** @description Successful Response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['CalculationResponse'];
        };
      };
      /** @description Missing, expired, or invalid bearer token. */
      401: {
        headers: {
          /** @description Identity error code when AUTH_ENABLED; legacy response body is preserved. */
          'X-Auth-Error'?: string;
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description account_read_only: writes require confirmed trial or paid access. */
      402: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description Cookie mutation requires exact Origin and current CSRF proof. */
      403: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description The request body exceeds this endpoint's streaming limit. */
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
          /** @description Identity error code when AUTH_ENABLED; legacy response body is preserved. */
          'X-Auth-Error'?: string;
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
    };
  };
  bankroll_api_v1_calculadoras_percentual_banca_post: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody: {
      content: {
        'application/json': components['schemas']['BankrollRequest'];
      };
    };
    responses: {
      /** @description Successful Response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['CalculationResponse'];
        };
      };
      /** @description Missing, expired, or invalid bearer token. */
      401: {
        headers: {
          /** @description Identity error code when AUTH_ENABLED; legacy response body is preserved. */
          'X-Auth-Error'?: string;
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description account_read_only: writes require confirmed trial or paid access. */
      402: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description Cookie mutation requires exact Origin and current CSRF proof. */
      403: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description The request body exceeds this endpoint's streaming limit. */
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
          /** @description Identity error code when AUTH_ENABLED; legacy response body is preserved. */
          'X-Auth-Error'?: string;
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
    };
  };
  candidate_api_v1_catalogo_candidatos_post: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody: {
      content: {
        'application/json': components['schemas']['ManualCandidate'];
      };
    };
    responses: {
      /** @description Successful Response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ManualReceipt'];
        };
      };
      /** @description Exact host/access confirmation required. */
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
      /** @description account_read_only: writes require confirmed trial or paid access. */
      402: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description Explicit catalog operator authorization required. */
      403: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description Method not allowed */
      405: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description The request body exceeds this endpoint's streaming limit. */
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
      /** @description account_read_only: retain the extension outbox. */
      402: {
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
      /** @description The request body exceeds this endpoint's streaming limit. */
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
  receive_batch_api_v1_coleta_batches_post: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody: {
      content: {
        'application/json': components['schemas']['CollectionBatch'];
      };
    };
    responses: {
      /** @description Successful Response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['BatchAck'];
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
      /** @description Missing, expired, or invalid bearer token. */
      401: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description account_read_only: retain the extension outbox. */
      402: {
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
      /** @description Collection resource unavailable */
      404: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description Explicit session selection required */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description The request body exceeds this endpoint's streaming limit. */
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
  catalog_api_v1_coleta_catalogo_get: {
    parameters: {
      query: {
        /** @description Versão estável do cliente em três componentes. */
        client_version: string;
        /** @description Ambiente esperado, vinculado à assinatura. */
        environment: string;
        /** @description Maior versão já verificada; downgrade é recusado. */
        known_version?: number;
      };
      header?: {
        /** @description Credencial opaca de instalação pareada, não token legado de usuário. */
        'X-Coleta-Token'?: string | null;
        /** @description ETag previamente autenticado e verificado. */
        'If-None-Match'?: string | null;
      };
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
          'application/json': components['schemas']['CatalogEnvelope'];
        };
      };
      /** @description Authenticated current catalog is unchanged. */
      304: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
      /** @description Invalid credential transport or catalog query */
      400: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description Installation credential is invalid, expired or revoked. */
      403: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description Method not allowed */
      405: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description Catalog environment or monotonic version differs. */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description Validation Error */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['HTTPValidationError'];
        };
      };
      /** @description Client version is unsupported. */
      426: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description Installation or IP quota exceeded */
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
      /** @description No unexpired signed publication or installation prerequisite. */
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
  published_release_api_v1_coleta_contract_get: {
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
          'application/json': components['schemas']['CollectionRelease'];
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
      /** @description Missing, expired, or invalid bearer token. */
      401: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description account_read_only: retain the extension outbox. */
      402: {
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
      /** @description Collection resource unavailable */
      404: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description Explicit session selection required */
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
  published_schema_api_v1_coleta_contract_schema_get: {
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
          'application/json': {
            [key: string]: components['schemas']['JsonValue'];
          };
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
      /** @description Missing, expired, or invalid bearer token. */
      401: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description account_read_only: retain the extension outbox. */
      402: {
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
      /** @description Collection resource unavailable */
      404: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description Explicit session selection required */
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
  list_installations_api_v1_coleta_installations_get: {
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
          'application/json': components['schemas']['InstallationResponse'][];
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
      /** @description Missing, expired, or invalid bearer token. */
      401: {
        headers: {
          /** @description Identity error code when AUTH_ENABLED; legacy response body is preserved. */
          'X-Auth-Error'?: string;
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description account_read_only: retain the extension outbox. */
      402: {
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
      /** @description Installation unavailable */
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
          /** @description Identity error code when AUTH_ENABLED; legacy response body is preserved. */
          'X-Auth-Error'?: string;
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
    };
  };
  revoke_api_v1_coleta_installations__instalacao_id__delete: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        /** @description ID interno da instalação do usuário autenticado. */
        instalacao_id: number;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Successful Response */
      204: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
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
      /** @description Missing, expired, or invalid bearer token. */
      401: {
        headers: {
          /** @description Identity error code when AUTH_ENABLED; legacy response body is preserved. */
          'X-Auth-Error'?: string;
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description account_read_only: retain the extension outbox. */
      402: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description Cookie mutation requires exact Origin and current CSRF proof. */
      403: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description Installation unavailable */
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
          /** @description Identity error code when AUTH_ENABLED; legacy response body is preserved. */
          'X-Auth-Error'?: string;
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
    };
  };
  rotate_api_v1_coleta_installations__instalacao_id__rotate_post: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        /** @description ID interno da instalação do usuário autenticado. */
        instalacao_id: number;
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
          'application/json': components['schemas']['InstallationTokenResponse'];
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
      /** @description Missing, expired, or invalid bearer token. */
      401: {
        headers: {
          /** @description Identity error code when AUTH_ENABLED; legacy response body is preserved. */
          'X-Auth-Error'?: string;
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description account_read_only: retain the extension outbox. */
      402: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description Cookie mutation requires exact Origin and current CSRF proof. */
      403: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description Installation unavailable */
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
          /** @description Identity error code when AUTH_ENABLED; legacy response body is preserved. */
          'X-Auth-Error'?: string;
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
    };
  };
  job_status_api_v1_coleta_jobs__job_id__get: {
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
          'application/json': components['schemas']['JobStatus'];
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
      /** @description Missing, expired, or invalid bearer token. */
      401: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description account_read_only: retain the extension outbox. */
      402: {
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
      /** @description Collection resource unavailable */
      404: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description Explicit session selection required */
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
  issue_code_api_v1_coleta_pairing_codes_post: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Successful Response */
      201: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['PairingCodeResponse'];
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
      /** @description Missing, expired, or invalid bearer token. */
      401: {
        headers: {
          /** @description Identity error code when AUTH_ENABLED; legacy response body is preserved. */
          'X-Auth-Error'?: string;
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description account_read_only: retain the extension outbox. */
      402: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description Cookie mutation requires exact Origin and current CSRF proof. */
      403: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description Installation unavailable */
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
          /** @description Identity error code when AUTH_ENABLED; legacy response body is preserved. */
          'X-Auth-Error'?: string;
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
    };
  };
  exchange_code_api_v1_coleta_pairing_exchange_post: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody: {
      content: {
        'application/json': components['schemas']['PairingExchange'];
      };
    };
    responses: {
      /** @description Successful Response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['InstallationTokenResponse'];
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
      /** @description Missing, expired, or invalid bearer token. */
      401: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description account_read_only: retain the extension outbox. */
      402: {
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
      /** @description Installation unavailable */
      404: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description The request body exceeds this endpoint's streaming limit. */
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
  open_session_api_v1_coleta_sessions_post: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody: {
      content: {
        'application/json': components['schemas']['SessionRequest'];
      };
    };
    responses: {
      /** @description Successful Response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['SessionResponse'];
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
      /** @description Missing, expired, or invalid bearer token. */
      401: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description account_read_only: retain the extension outbox. */
      402: {
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
      /** @description Collection resource unavailable */
      404: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description Explicit session selection required */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description The request body exceeds this endpoint's streaming limit. */
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
  read_session_api_v1_coleta_sessions__sessao_id__get: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        /** @description UUID opaco da sessão pertencente à instalação autenticada. */
        sessao_id: string;
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
          'application/json': components['schemas']['SessionResponse'];
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
      /** @description Missing, expired, or invalid bearer token. */
      401: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description account_read_only: retain the extension outbox. */
      402: {
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
      /** @description Collection resource unavailable */
      404: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description Explicit session selection required */
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
  close_session_api_v1_coleta_sessions__sessao_id__delete: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        /** @description UUID opaco da sessão pertencente à instalação autenticada. */
        sessao_id: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Successful Response */
      204: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
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
      /** @description Missing, expired, or invalid bearer token. */
      401: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description account_read_only: retain the extension outbox. */
      402: {
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
      /** @description Collection resource unavailable */
      404: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description Explicit session selection required */
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
  installation_status_api_v1_coleta_status_get: {
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
          'application/json': components['schemas']['InstallationStatusResponse'];
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
      /** @description Missing, expired, or invalid bearer token. */
      401: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description account_read_only: retain the extension outbox. */
      402: {
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
      /** @description Installation unavailable */
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
  consolidar_revisada_api_v1_consolidacoes_post: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody: {
      content: {
        'application/json': components['schemas']['ConsolidacaoPedido'];
      };
    };
    responses: {
      /** @description Successful Response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ConsolidacaoResposta'];
        };
      };
      /** @description Missing, expired, or invalid bearer token. */
      401: {
        headers: {
          /** @description Identity error code when AUTH_ENABLED; legacy response body is preserved. */
          'X-Auth-Error'?: string;
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description account_read_only: writes require confirmed trial or paid access. */
      402: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description Cookie mutation requires exact Origin and current CSRF proof. */
      403: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description The request body exceeds this endpoint's streaming limit. */
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
          /** @description Identity error code when AUTH_ENABLED; legacy response body is preserved. */
          'X-Auth-Error'?: string;
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
    };
  };
  desvincular_revisada_api_v1_consolidacoes__relacao_id__desvincular_post: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        /** @description Identificador da decisão de consolidação pertencente ao usuário. */
        relacao_id: number;
      };
      cookie?: never;
    };
    requestBody: {
      content: {
        'application/json': components['schemas']['DesvinculacaoPedido'];
      };
    };
    responses: {
      /** @description Successful Response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ConsolidacaoResposta'];
        };
      };
      /** @description Missing, expired, or invalid bearer token. */
      401: {
        headers: {
          /** @description Identity error code when AUTH_ENABLED; legacy response body is preserved. */
          'X-Auth-Error'?: string;
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description account_read_only: writes require confirmed trial or paid access. */
      402: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description Cookie mutation requires exact Origin and current CSRF proof. */
      403: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description The request body exceeds this endpoint's streaming limit. */
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
          /** @description Identity error code when AUTH_ENABLED; legacy response body is preserved. */
          'X-Auth-Error'?: string;
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
    };
  };
  telegram_webhook_api_v1_integrations_telegram_webhook_post: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody: {
      content: {
        'application/json': {
          callback_query?: {
            [key: string]: components['schemas']['JsonValue'];
          };
          edited_message?: {
            [key: string]: components['schemas']['JsonValue'];
          };
          message?: {
            [key: string]: components['schemas']['JsonValue'];
          };
          update_id: number;
        } & {
          [key: string]: components['schemas']['JsonValue'];
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
          'application/json': components['schemas']['TelegramWebhookAck'];
        };
      };
      /** @description Invalid Telegram update. */
      400: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description Invalid webhook secret. */
      403: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description Update body exceeds 128 KiB. */
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
      /** @description JSON content type is required. */
      415: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description Webhook request limit exceeded. */
      429: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description Webhook is not configured. */
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
          /** @description Identity error code when AUTH_ENABLED; legacy response body is preserved. */
          'X-Auth-Error'?: string;
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description account_read_only: writes require confirmed trial or paid access. */
      402: {
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
          /** @description Identity error code when AUTH_ENABLED; legacy response body is preserved. */
          'X-Auth-Error'?: string;
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
    };
  };
  consultar_analises_api_v1_painel_analises_get: {
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
          'application/json': components['schemas']['AnalisesSaida'];
        };
      };
      /** @description Missing, expired, or invalid bearer token. */
      401: {
        headers: {
          /** @description Identity error code when AUTH_ENABLED; legacy response body is preserved. */
          'X-Auth-Error'?: string;
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description account_read_only: writes require confirmed trial or paid access. */
      402: {
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
          /** @description Identity error code when AUTH_ENABLED; legacy response body is preserved. */
          'X-Auth-Error'?: string;
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
          /** @description Identity error code when AUTH_ENABLED; legacy response body is preserved. */
          'X-Auth-Error'?: string;
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description account_read_only: writes require confirmed trial or paid access. */
      402: {
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
          /** @description Identity error code when AUTH_ENABLED; legacy response body is preserved. */
          'X-Auth-Error'?: string;
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
    };
  };
  listar_metas_api_v1_painel_metas_get: {
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
          'application/json': components['schemas']['MetaSaida'][];
        };
      };
      /** @description Missing, expired, or invalid bearer token. */
      401: {
        headers: {
          /** @description Identity error code when AUTH_ENABLED; legacy response body is preserved. */
          'X-Auth-Error'?: string;
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description account_read_only: writes require confirmed trial or paid access. */
      402: {
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
          /** @description Identity error code when AUTH_ENABLED; legacy response body is preserved. */
          'X-Auth-Error'?: string;
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
    };
  };
  criar_meta_api_v1_painel_metas_post: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody: {
      content: {
        'application/json': components['schemas']['MetaEntrada'];
      };
    };
    responses: {
      /** @description Successful Response */
      201: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['MetaSaida'];
        };
      };
      /** @description Missing, expired, or invalid bearer token. */
      401: {
        headers: {
          /** @description Identity error code when AUTH_ENABLED; legacy response body is preserved. */
          'X-Auth-Error'?: string;
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description account_read_only: writes require confirmed trial or paid access. */
      402: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description Cookie mutation requires exact Origin and current CSRF proof. */
      403: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description The request body exceeds this endpoint's streaming limit. */
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
          /** @description Identity error code when AUTH_ENABLED; legacy response body is preserved. */
          'X-Auth-Error'?: string;
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
    };
  };
  ler_meta_api_v1_painel_metas__meta_id__get: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        /** @description Identificador de uma meta pertencente ao usuário autenticado. */
        meta_id: number;
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
          'application/json': components['schemas']['MetaSaida'];
        };
      };
      /** @description Missing, expired, or invalid bearer token. */
      401: {
        headers: {
          /** @description Identity error code when AUTH_ENABLED; legacy response body is preserved. */
          'X-Auth-Error'?: string;
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description account_read_only: writes require confirmed trial or paid access. */
      402: {
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
          /** @description Identity error code when AUTH_ENABLED; legacy response body is preserved. */
          'X-Auth-Error'?: string;
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
    };
  };
  arquivar_meta_api_v1_painel_metas__meta_id__delete: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        /** @description Identificador de uma meta pertencente ao usuário autenticado. */
        meta_id: number;
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
          'application/json': components['schemas']['MetaSaida'];
        };
      };
      /** @description Missing, expired, or invalid bearer token. */
      401: {
        headers: {
          /** @description Identity error code when AUTH_ENABLED; legacy response body is preserved. */
          'X-Auth-Error'?: string;
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description account_read_only: writes require confirmed trial or paid access. */
      402: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description Cookie mutation requires exact Origin and current CSRF proof. */
      403: {
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
          /** @description Identity error code when AUTH_ENABLED; legacy response body is preserved. */
          'X-Auth-Error'?: string;
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
    };
  };
  alterar_meta_api_v1_painel_metas__meta_id__patch: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        /** @description Identificador de uma meta pertencente ao usuário autenticado. */
        meta_id: number;
      };
      cookie?: never;
    };
    requestBody: {
      content: {
        'application/json': components['schemas']['MetaAlteracao'];
      };
    };
    responses: {
      /** @description Successful Response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['MetaSaida'];
        };
      };
      /** @description Missing, expired, or invalid bearer token. */
      401: {
        headers: {
          /** @description Identity error code when AUTH_ENABLED; legacy response body is preserved. */
          'X-Auth-Error'?: string;
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description account_read_only: writes require confirmed trial or paid access. */
      402: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description Cookie mutation requires exact Origin and current CSRF proof. */
      403: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description The request body exceeds this endpoint's streaming limit. */
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
          /** @description Identity error code when AUTH_ENABLED; legacy response body is preserved. */
          'X-Auth-Error'?: string;
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
          /** @description Identity error code when AUTH_ENABLED; legacy response body is preserved. */
          'X-Auth-Error'?: string;
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description account_read_only: writes require confirmed trial or paid access. */
      402: {
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
          /** @description Identity error code when AUTH_ENABLED; legacy response body is preserved. */
          'X-Auth-Error'?: string;
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
    };
  };
  ler_preferencias_api_v1_painel_preferencias_get: {
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
          'application/json': components['schemas']['FusoEntrada'];
        };
      };
      /** @description Missing, expired, or invalid bearer token. */
      401: {
        headers: {
          /** @description Identity error code when AUTH_ENABLED; legacy response body is preserved. */
          'X-Auth-Error'?: string;
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description account_read_only: writes require confirmed trial or paid access. */
      402: {
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
          /** @description Identity error code when AUTH_ENABLED; legacy response body is preserved. */
          'X-Auth-Error'?: string;
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
    };
  };
  alterar_preferencias_api_v1_painel_preferencias_patch: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody: {
      content: {
        'application/json': components['schemas']['FusoEntrada'];
      };
    };
    responses: {
      /** @description Successful Response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['FusoEntrada'];
        };
      };
      /** @description Missing, expired, or invalid bearer token. */
      401: {
        headers: {
          /** @description Identity error code when AUTH_ENABLED; legacy response body is preserved. */
          'X-Auth-Error'?: string;
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description account_read_only: writes require confirmed trial or paid access. */
      402: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description Cookie mutation requires exact Origin and current CSRF proof. */
      403: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description The request body exceeds this endpoint's streaming limit. */
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
          /** @description Identity error code when AUTH_ENABLED; legacy response body is preserved. */
          'X-Auth-Error'?: string;
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
          /** @description Identity error code when AUTH_ENABLED; legacy response body is preserved. */
          'X-Auth-Error'?: string;
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description account_read_only: writes require confirmed trial or paid access. */
      402: {
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
          /** @description Identity error code when AUTH_ENABLED; legacy response body is preserved. */
          'X-Auth-Error'?: string;
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
          /** @description Identity error code when AUTH_ENABLED; legacy response body is preserved. */
          'X-Auth-Error'?: string;
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description account_read_only: writes require confirmed trial or paid access. */
      402: {
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
          /** @description Identity error code when AUTH_ENABLED; legacy response body is preserved. */
          'X-Auth-Error'?: string;
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
          /** @description Identity error code when AUTH_ENABLED; legacy response body is preserved. */
          'X-Auth-Error'?: string;
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description account_read_only: writes require confirmed trial or paid access. */
      402: {
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
          /** @description Identity error code when AUTH_ENABLED; legacy response body is preserved. */
          'X-Auth-Error'?: string;
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
          /** @description Identity error code when AUTH_ENABLED; legacy response body is preserved. */
          'X-Auth-Error'?: string;
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description account_read_only: writes require confirmed trial or paid access. */
      402: {
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
          /** @description Identity error code when AUTH_ENABLED; legacy response body is preserved. */
          'X-Auth-Error'?: string;
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
          /** @description Identity error code when AUTH_ENABLED; legacy response body is preserved. */
          'X-Auth-Error'?: string;
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description account_read_only: writes require confirmed trial or paid access. */
      402: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description Cookie mutation requires exact Origin and current CSRF proof. */
      403: {
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
      /** @description The request body exceeds this endpoint's streaming limit. */
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
          /** @description Identity error code when AUTH_ENABLED; legacy response body is preserved. */
          'X-Auth-Error'?: string;
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
    };
  };
  consultar_vinculo_api_v1_telegram_link_get: {
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
          'application/json': components['schemas']['LinkStatusResponse'];
        };
      };
      /** @description Missing, expired, or invalid bearer token. */
      401: {
        headers: {
          /** @description Identity error code when AUTH_ENABLED; legacy response body is preserved. */
          'X-Auth-Error'?: string;
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description account_read_only: writes require confirmed trial or paid access. */
      402: {
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
          /** @description Identity error code when AUTH_ENABLED; legacy response body is preserved. */
          'X-Auth-Error'?: string;
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
    };
  };
  revogar_vinculo_api_v1_telegram_link_delete: {
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
          'application/json': components['schemas']['RevocationResponse'];
        };
      };
      /** @description Missing, expired, or invalid bearer token. */
      401: {
        headers: {
          /** @description Identity error code when AUTH_ENABLED; legacy response body is preserved. */
          'X-Auth-Error'?: string;
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description account_read_only: writes require confirmed trial or paid access. */
      402: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description Cookie mutation requires exact Origin and current CSRF proof. */
      403: {
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
          /** @description Identity error code when AUTH_ENABLED; legacy response body is preserved. */
          'X-Auth-Error'?: string;
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
    };
  };
  criar_codigo_api_v1_telegram_link_codes_post: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Successful Response */
      201: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['LinkCodeResponse'];
        };
      };
      /** @description Missing, expired, or invalid bearer token. */
      401: {
        headers: {
          /** @description Identity error code when AUTH_ENABLED; legacy response body is preserved. */
          'X-Auth-Error'?: string;
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description account_read_only: writes require confirmed trial or paid access. */
      402: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description Cookie mutation requires exact Origin and current CSRF proof. */
      403: {
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
          /** @description Identity error code when AUTH_ENABLED; legacy response body is preserved. */
          'X-Auth-Error'?: string;
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
    };
  };
  listar_titulares_api_v1_titulares_get: {
    parameters: {
      query?: {
        /** @description Busca textual pelo nome do titular. */
        search?: string | null;
        /** @description Inclui titulares arquivados na listagem quando verdadeiro. */
        include_archived?: boolean;
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
          'application/json': components['schemas']['TitularesPaginaSaida'];
        };
      };
      /** @description Missing, expired, or invalid bearer token. */
      401: {
        headers: {
          /** @description Identity error code when AUTH_ENABLED; legacy response body is preserved. */
          'X-Auth-Error'?: string;
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description account_read_only: writes require confirmed trial or paid access. */
      402: {
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
          /** @description Identity error code when AUTH_ENABLED; legacy response body is preserved. */
          'X-Auth-Error'?: string;
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
    };
  };
  criar_titular_api_v1_titulares_post: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody: {
      content: {
        'application/json': components['schemas']['TitularEntrada'];
      };
    };
    responses: {
      /** @description Successful Response */
      201: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['TitularSaida'];
        };
      };
      /** @description Missing, expired, or invalid bearer token. */
      401: {
        headers: {
          /** @description Identity error code when AUTH_ENABLED; legacy response body is preserved. */
          'X-Auth-Error'?: string;
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description account_read_only: writes require confirmed trial or paid access. */
      402: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description Cookie mutation requires exact Origin and current CSRF proof. */
      403: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description The request body exceeds this endpoint's streaming limit. */
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
          /** @description Identity error code when AUTH_ENABLED; legacy response body is preserved. */
          'X-Auth-Error'?: string;
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
    };
  };
  matriz_casa_api_v1_titulares_casas__casa_id__matriz_get: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        /** @description Identificador canônico da casa usada como filtro. */
        casa_id: number;
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
          'application/json': components['schemas']['MatrizCasaSaida'];
        };
      };
      /** @description Missing, expired, or invalid bearer token. */
      401: {
        headers: {
          /** @description Identity error code when AUTH_ENABLED; legacy response body is preserved. */
          'X-Auth-Error'?: string;
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description account_read_only: writes require confirmed trial or paid access. */
      402: {
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
          /** @description Identity error code when AUTH_ENABLED; legacy response body is preserved. */
          'X-Auth-Error'?: string;
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
    };
  };
  consultar_financeiro_api_v1_titulares_financeiro_get: {
    parameters: {
      query?: {
        /** @description Limite inicial inclusivo do intervalo, em ISO 8601. */
        desde?: string | null;
        /** @description Limite final exclusivo do intervalo, em ISO 8601. */
        ate?: string | null;
        /** @description Identificador canônico da casa usada como filtro. */
        casa_id?: number | null;
        /** @description Identificador do titular pertencente ao usuário. */
        titular_id?: number | null;
        /** @description Identificador da conta da casa usada como filtro. */
        conta_casa_id?: number | null;
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
          'application/json': components['schemas']['FinanceiroSaida'];
        };
      };
      /** @description Missing, expired, or invalid bearer token. */
      401: {
        headers: {
          /** @description Identity error code when AUTH_ENABLED; legacy response body is preserved. */
          'X-Auth-Error'?: string;
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description account_read_only: writes require confirmed trial or paid access. */
      402: {
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
          /** @description Identity error code when AUTH_ENABLED; legacy response body is preserved. */
          'X-Auth-Error'?: string;
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
    };
  };
  aplicar_troca_api_v1_titulares_trocas_post: {
    parameters: {
      query?: never;
      header: {
        /** @description Chave opaca obrigatória do cliente; reutilizá-la com o mesmo corpo reproduz a resposta original sem repetir a operação. */
        'Idempotency-Key': string;
      };
      path?: never;
      cookie?: never;
    };
    requestBody: {
      content: {
        'application/json': components['schemas']['TrocaContaEntrada'];
      };
    };
    responses: {
      /** @description Successful Response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['TrocaContaSaida'];
        };
      };
      /** @description Missing, expired, or invalid bearer token. */
      401: {
        headers: {
          /** @description Identity error code when AUTH_ENABLED; legacy response body is preserved. */
          'X-Auth-Error'?: string;
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description account_read_only: writes require confirmed trial or paid access. */
      402: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description Cookie mutation requires exact Origin and current CSRF proof. */
      403: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description The request body exceeds this endpoint's streaming limit. */
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
          /** @description Identity error code when AUTH_ENABLED; legacy response body is preserved. */
          'X-Auth-Error'?: string;
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
    };
  };
  preview_troca_api_v1_titulares_trocas_preview_post: {
    parameters: {
      query?: never;
      header: {
        /** @description Chave opaca obrigatória do cliente; reutilizá-la com o mesmo corpo reproduz a resposta original sem repetir a operação. */
        'Idempotency-Key': string;
      };
      path?: never;
      cookie?: never;
    };
    requestBody: {
      content: {
        'application/json': components['schemas']['TrocaContaEntrada'];
      };
    };
    responses: {
      /** @description Successful Response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['TrocaContaSaida'];
        };
      };
      /** @description Missing, expired, or invalid bearer token. */
      401: {
        headers: {
          /** @description Identity error code when AUTH_ENABLED; legacy response body is preserved. */
          'X-Auth-Error'?: string;
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description account_read_only: writes require confirmed trial or paid access. */
      402: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description Cookie mutation requires exact Origin and current CSRF proof. */
      403: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description The request body exceeds this endpoint's streaming limit. */
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
          /** @description Identity error code when AUTH_ENABLED; legacy response body is preserved. */
          'X-Auth-Error'?: string;
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
    };
  };
  obter_titular_api_v1_titulares__titular_id__get: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        /** @description Identificador do titular pertencente ao usuário. */
        titular_id: number;
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
          'application/json': components['schemas']['TitularSaida'];
        };
      };
      /** @description Missing, expired, or invalid bearer token. */
      401: {
        headers: {
          /** @description Identity error code when AUTH_ENABLED; legacy response body is preserved. */
          'X-Auth-Error'?: string;
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description account_read_only: writes require confirmed trial or paid access. */
      402: {
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
          /** @description Identity error code when AUTH_ENABLED; legacy response body is preserved. */
          'X-Auth-Error'?: string;
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
    };
  };
  arquivar_titular_api_v1_titulares__titular_id__delete: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        /** @description Identificador do titular pertencente ao usuário. */
        titular_id: number;
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
          'application/json': components['schemas']['TitularSaida'];
        };
      };
      /** @description Missing, expired, or invalid bearer token. */
      401: {
        headers: {
          /** @description Identity error code when AUTH_ENABLED; legacy response body is preserved. */
          'X-Auth-Error'?: string;
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description account_read_only: writes require confirmed trial or paid access. */
      402: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description Cookie mutation requires exact Origin and current CSRF proof. */
      403: {
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
          /** @description Identity error code when AUTH_ENABLED; legacy response body is preserved. */
          'X-Auth-Error'?: string;
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
    };
  };
  editar_titular_api_v1_titulares__titular_id__patch: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        /** @description Identificador do titular pertencente ao usuário. */
        titular_id: number;
      };
      cookie?: never;
    };
    requestBody: {
      content: {
        'application/json': components['schemas']['TitularEntrada'];
      };
    };
    responses: {
      /** @description Successful Response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['TitularSaida'];
        };
      };
      /** @description Missing, expired, or invalid bearer token. */
      401: {
        headers: {
          /** @description Identity error code when AUTH_ENABLED; legacy response body is preserved. */
          'X-Auth-Error'?: string;
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description account_read_only: writes require confirmed trial or paid access. */
      402: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description Cookie mutation requires exact Origin and current CSRF proof. */
      403: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description The request body exceeds this endpoint's streaming limit. */
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
          /** @description Identity error code when AUTH_ENABLED; legacy response body is preserved. */
          'X-Auth-Error'?: string;
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
    };
  };
  criar_conta_titular_api_v1_titulares__titular_id__contas_post: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        /** @description Identificador do titular pertencente ao usuário. */
        titular_id: number;
      };
      cookie?: never;
    };
    requestBody: {
      content: {
        'application/json': components['schemas']['ContaEntrada'];
      };
    };
    responses: {
      /** @description Successful Response */
      201: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ContaMatrizSaida'];
        };
      };
      /** @description Missing, expired, or invalid bearer token. */
      401: {
        headers: {
          /** @description Identity error code when AUTH_ENABLED; legacy response body is preserved. */
          'X-Auth-Error'?: string;
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description account_read_only: writes require confirmed trial or paid access. */
      402: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description Cookie mutation requires exact Origin and current CSRF proof. */
      403: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description The request body exceeds this endpoint's streaming limit. */
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
          /** @description Identity error code when AUTH_ENABLED; legacy response body is preserved. */
          'X-Auth-Error'?: string;
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
    };
  };
  editar_conta_titular_api_v1_titulares__titular_id__contas__conta_id__patch: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        /** @description Identificador do titular pertencente ao usuário. */
        titular_id: number;
        /** @description Identificador da conta estável da casa pertencente ao titular. */
        conta_id: number;
      };
      cookie?: never;
    };
    requestBody: {
      content: {
        'application/json': components['schemas']['ContaEdicao'];
      };
    };
    responses: {
      /** @description Successful Response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ContaMatrizSaida'];
        };
      };
      /** @description Missing, expired, or invalid bearer token. */
      401: {
        headers: {
          /** @description Identity error code when AUTH_ENABLED; legacy response body is preserved. */
          'X-Auth-Error'?: string;
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description account_read_only: writes require confirmed trial or paid access. */
      402: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description Cookie mutation requires exact Origin and current CSRF proof. */
      403: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description The request body exceeds this endpoint's streaming limit. */
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
          /** @description Identity error code when AUTH_ENABLED; legacy response body is preserved. */
          'X-Auth-Error'?: string;
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
    };
  };
  ativar_conta_titular_api_v1_titulares__titular_id__contas__conta_id__ativar_post: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        /** @description Identificador do titular pertencente ao usuário. */
        titular_id: number;
        /** @description Identificador da conta estável da casa pertencente ao titular. */
        conta_id: number;
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
          'application/json': components['schemas']['ContaMatrizSaida'];
        };
      };
      /** @description Missing, expired, or invalid bearer token. */
      401: {
        headers: {
          /** @description Identity error code when AUTH_ENABLED; legacy response body is preserved. */
          'X-Auth-Error'?: string;
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description account_read_only: writes require confirmed trial or paid access. */
      402: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description Cookie mutation requires exact Origin and current CSRF proof. */
      403: {
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
          /** @description Identity error code when AUTH_ENABLED; legacy response body is preserved. */
          'X-Auth-Error'?: string;
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
    };
  };
  matriz_titular_api_v1_titulares__titular_id__matriz_get: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        /** @description Identificador do titular pertencente ao usuário. */
        titular_id: number;
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
          'application/json': components['schemas']['MatrizTitularSaida'];
        };
      };
      /** @description Missing, expired, or invalid bearer token. */
      401: {
        headers: {
          /** @description Identity error code when AUTH_ENABLED; legacy response body is preserved. */
          'X-Auth-Error'?: string;
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description account_read_only: writes require confirmed trial or paid access. */
      402: {
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
          /** @description Identity error code when AUTH_ENABLED; legacy response body is preserved. */
          'X-Auth-Error'?: string;
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
          /** @description Identity error code when AUTH_ENABLED; legacy response body is preserved. */
          'X-Auth-Error'?: string;
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description account_read_only: writes require confirmed trial or paid access. */
      402: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description Cookie mutation requires exact Origin and current CSRF proof. */
      403: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description The upload exceeds either the declared application limit (JSON) or the endpoint streaming limit (plain text). */
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
          /** @description Identity error code when AUTH_ENABLED; legacy response body is preserved. */
          'X-Auth-Error'?: string;
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
          /** @description Identity error code when AUTH_ENABLED; legacy response body is preserved. */
          'X-Auth-Error'?: string;
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description account_read_only: writes require confirmed trial or paid access. */
      402: {
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
          /** @description Identity error code when AUTH_ENABLED; legacy response body is preserved. */
          'X-Auth-Error'?: string;
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
    };
  };
  anonimizar_minha_conta_api_v1_usuario_me_delete: {
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
          'application/json': components['schemas']['AnonymizeResponse'];
        };
      };
      /** @description Missing, expired, or invalid bearer token. */
      401: {
        headers: {
          /** @description Identity error code when AUTH_ENABLED; legacy response body is preserved. */
          'X-Auth-Error'?: string;
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description account_read_only: writes require confirmed trial or paid access. */
      402: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description Cookie mutation requires exact Origin and current CSRF proof. */
      403: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description Há mensagens ou fotos sem dono exclusivo no banco. */
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
          /** @description Identity error code when AUTH_ENABLED; legacy response body is preserved. */
          'X-Auth-Error'?: string;
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
    };
  };
  exportar_meus_dados_api_v1_usuario_me_export_get: {
    parameters: {
      query?: {
        /** @description Formato da exportação dos dados da conta: JSON ou Excel. */
        formato?: 'json' | 'xlsx';
      };
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Exportação dos registros vinculados à conta. */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': {
            apostas: {
              [key: string]: components['schemas']['JsonValue'];
            }[];
            assinaturas: {
              [key: string]: components['schemas']['JsonValue'];
            }[];
            audit_log: {
              [key: string]: components['schemas']['JsonValue'];
            }[];
            bancas: {
              [key: string]: components['schemas']['JsonValue'];
            }[];
            chamadas_ia: {
              [key: string]: components['schemas']['JsonValue'];
            }[];
            coleta_token: {
              [key: string]: components['schemas']['JsonValue'];
            }[];
            coletas_casa: {
              [key: string]: components['schemas']['JsonValue'];
            }[];
            contas_casa: {
              [key: string]: components['schemas']['JsonValue'];
            }[];
            eventos: {
              [key: string]: components['schemas']['JsonValue'];
            }[];
            metas_desempenho: {
              [key: string]: components['schemas']['JsonValue'];
            }[];
            movimento_requisicoes: {
              [key: string]: components['schemas']['JsonValue'];
            }[];
            movimentos: {
              [key: string]: components['schemas']['JsonValue'];
            }[];
            rascunho_correcoes: {
              [key: string]: components['schemas']['JsonValue'];
            }[];
            rascunhos_aposta: {
              [key: string]: components['schemas']['JsonValue'];
            }[];
            revisao_pendente: {
              [key: string]: components['schemas']['JsonValue'];
            }[];
            telegram_link_codes: {
              [key: string]: components['schemas']['JsonValue'];
            }[];
            telegram_links: {
              [key: string]: components['schemas']['JsonValue'];
            }[];
            telegram_outbox: {
              [key: string]: components['schemas']['JsonValue'];
            }[];
            titulares: {
              [key: string]: components['schemas']['JsonValue'];
            }[];
            trocas_titular_eventos: {
              [key: string]: components['schemas']['JsonValue'];
            }[];
            trocas_titular_requisicoes: {
              [key: string]: components['schemas']['JsonValue'];
            }[];
            unidades: {
              [key: string]: components['schemas']['JsonValue'];
            }[];
            upload_arquivos: {
              [key: string]: components['schemas']['JsonValue'];
            }[];
            upload_bilhetes: {
              [key: string]: components['schemas']['JsonValue'];
            }[];
            uploads: {
              [key: string]: components['schemas']['JsonValue'];
            }[];
            usos_conta_casa: {
              [key: string]: components['schemas']['JsonValue'];
            }[];
            usuario: {
              [key: string]: components['schemas']['JsonValue'];
            };
          };
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': string;
        };
      };
      /** @description Missing, expired, or invalid bearer token. */
      401: {
        headers: {
          /** @description Identity error code when AUTH_ENABLED; legacy response body is preserved. */
          'X-Auth-Error'?: string;
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
      /** @description account_read_only: writes require confirmed trial or paid access. */
      402: {
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
          /** @description Identity error code when AUTH_ENABLED; legacy response body is preserved. */
          'X-Auth-Error'?: string;
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorResponse'];
        };
      };
    };
  };
  callback_auth_callback_get: {
    parameters: {
      query?: {
        /** @description State de uso único vinculado ao cookie de fluxo. */
        state?: string;
        /** @description Código de autorização de uso único do emissor. */
        code?: string;
        /** @description Recusa do emissor; nunca refletida em destinos nem logs. */
        error?: string | null;
      };
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Verified identity provisioned and internal server session created; navigate to the stored internal destination. */
      302: {
        headers: {
          Location?: string;
          [name: string]: unknown;
        };
        content?: never;
      };
      /** @description Callback, state or destination is invalid. */
      400: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['AuthFailure'];
        };
      };
      /** @description Session/identity is missing, expired, revoked or inactive. */
      401: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['AuthFailure'];
        };
      };
      /** @description Email is unconfirmed or origin/CSRF proof is invalid. */
      403: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['AuthFailure'];
        };
      };
      /** @description Email conflicts with a different internal identity; never auto-linked. */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['AuthFailure'];
        };
      };
      /** @description Invalid identity query; sensitive input is never reflected in the response. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['AuthFailure'];
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
      /** @description Identity is not configured or issuer/database is temporarily unavailable. */
      503: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json':
            | components['schemas']['AuthFailure']
            | components['schemas']['ErrorResponse'];
        };
      };
    };
  };
  jwks_auth_jwks_get: {
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
          'application/json': components['schemas']['PublicKeys'];
        };
      };
      /** @description Callback, state or destination is invalid. */
      400: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['AuthFailure'];
        };
      };
      /** @description Session/identity is missing, expired, revoked or inactive. */
      401: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['AuthFailure'];
        };
      };
      /** @description Email is unconfirmed or origin/CSRF proof is invalid. */
      403: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['AuthFailure'];
        };
      };
      /** @description Email conflicts with a different internal identity; never auto-linked. */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['AuthFailure'];
        };
      };
      /** @description Invalid identity query; sensitive input is never reflected in the response. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['AuthFailure'];
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
      /** @description Identity is not configured or issuer/database is temporarily unavailable. */
      503: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json':
            | components['schemas']['AuthFailure']
            | components['schemas']['ErrorResponse'];
        };
      };
    };
  };
  logout_auth_logout_post: {
    parameters: {
      query?: {
        /** @description Revogar todas as sessões locais desta identidade confirmada. */
        all_sessions?: boolean;
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
          'application/json': components['schemas']['LogoutStatus'];
        };
      };
      /** @description Callback, state or destination is invalid. */
      400: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['AuthFailure'];
        };
      };
      /** @description Session/identity is missing, expired, revoked or inactive. */
      401: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['AuthFailure'];
        };
      };
      /** @description Email is unconfirmed or origin/CSRF proof is invalid. */
      403: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['AuthFailure'];
        };
      };
      /** @description Email conflicts with a different internal identity; never auto-linked. */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['AuthFailure'];
        };
      };
      /** @description Invalid identity query; sensitive input is never reflected in the response. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['AuthFailure'];
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
      /** @description Identity is not configured or issuer/database is temporarily unavailable. */
      503: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json':
            | components['schemas']['AuthFailure']
            | components['schemas']['ErrorResponse'];
        };
      };
    };
  };
  refresh_auth_refresh_post: {
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
          'application/json': components['schemas']['SessionStatus'];
        };
      };
      /** @description Callback, state or destination is invalid. */
      400: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['AuthFailure'];
        };
      };
      /** @description Session/identity is missing, expired, revoked or inactive. */
      401: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['AuthFailure'];
        };
      };
      /** @description Email is unconfirmed or origin/CSRF proof is invalid. */
      403: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['AuthFailure'];
        };
      };
      /** @description Email conflicts with a different internal identity; never auto-linked. */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['AuthFailure'];
        };
      };
      /** @description Invalid identity query; sensitive input is never reflected in the response. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['AuthFailure'];
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
      /** @description Identity is not configured or issuer/database is temporarily unavailable. */
      503: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json':
            | components['schemas']['AuthFailure']
            | components['schemas']['ErrorResponse'];
        };
      };
    };
  };
  session_status_auth_session_get: {
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
          'application/json': components['schemas']['SessionStatus'];
        };
      };
      /** @description Callback, state or destination is invalid. */
      400: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['AuthFailure'];
        };
      };
      /** @description Session/identity is missing, expired, revoked or inactive. */
      401: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['AuthFailure'];
        };
      };
      /** @description Email is unconfirmed or origin/CSRF proof is invalid. */
      403: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['AuthFailure'];
        };
      };
      /** @description Email conflicts with a different internal identity; never auto-linked. */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['AuthFailure'];
        };
      };
      /** @description Invalid identity query; sensitive input is never reflected in the response. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['AuthFailure'];
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
      /** @description Identity is not configured or issuer/database is temporarily unavailable. */
      503: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json':
            | components['schemas']['AuthFailure']
            | components['schemas']['ErrorResponse'];
        };
      };
    };
  };
  start_auth_start_get: {
    parameters: {
      query?: {
        /** @description Caminho interno do frontend; origens arbitrárias são recusadas. */
        return_to?: string;
        /** @description login, signup ou recover; use o link real do emissor. Recover revoga sessões locais anteriores após login verificado. */
        intent?: 'login' | 'signup' | 'recover';
      };
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Navigate to the issuer's hosted login, including registration and password recovery. */
      302: {
        headers: {
          Location?: string;
          [name: string]: unknown;
        };
        content?: never;
      };
      /** @description Callback, state or destination is invalid. */
      400: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['AuthFailure'];
        };
      };
      /** @description Session/identity is missing, expired, revoked or inactive. */
      401: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['AuthFailure'];
        };
      };
      /** @description Email is unconfirmed or origin/CSRF proof is invalid. */
      403: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['AuthFailure'];
        };
      };
      /** @description Email conflicts with a different internal identity; never auto-linked. */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['AuthFailure'];
        };
      };
      /** @description Invalid identity query; sensitive input is never reflected in the response. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['AuthFailure'];
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
      /** @description Identity is not configured or issuer/database is temporarily unavailable. */
      503: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json':
            | components['schemas']['AuthFailure']
            | components['schemas']['ErrorResponse'];
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
      /** @description account_read_only: retain the extension outbox. */
      402: {
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
      /** @description The request body exceeds this endpoint's streaming limit. */
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

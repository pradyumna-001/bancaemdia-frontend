// Generated from x-bancaemdia-policy in the same verified OpenAPI.
export const OPERATION_POLICIES = {
  'GET /api/v1/admin/casas': {
    access_modes: ['FULL_WRITE', 'READ_ONLY'],
    automatic_retry: { allowed: true, max_attempts: 3 },
    idempotency: { identity: 'none', recovery: null, retention: null },
  },
  'GET /api/v1/admin/casas/export': {
    access_modes: ['FULL_WRITE', 'READ_ONLY'],
    automatic_retry: { allowed: true, max_attempts: 3 },
    idempotency: { identity: 'none', recovery: null, retention: null },
  },
  'GET /api/v1/apostas': {
    access_modes: ['FULL_WRITE', 'READ_ONLY'],
    automatic_retry: { allowed: true, max_attempts: 3 },
    idempotency: { identity: 'none', recovery: null, retention: null },
  },
  'POST /api/v1/apostas': {
    access_modes: ['FULL_WRITE'],
    automatic_retry: { allowed: false, max_attempts: null },
    idempotency: { identity: 'none', recovery: null, retention: null },
  },
  'GET /api/v1/apostas-manuais/operacoes/{intencao_id}': {
    access_modes: ['FULL_WRITE', 'READ_ONLY'],
    automatic_retry: { allowed: true, max_attempts: 3 },
    idempotency: { identity: 'none', recovery: null, retention: null },
  },
  'POST /api/v1/apostas-manuais/operacoes/{intencao_id}': {
    access_modes: ['FULL_WRITE'],
    automatic_retry: { allowed: false, max_attempts: null },
    idempotency: {
      identity: 'path:intencao_id',
      recovery: 'GET /api/v1/apostas-manuais/operacoes/{intencao_id}',
      retention: 'until_account_deletion',
    },
  },
  'POST /api/v1/apostas/importar-planilha': {
    access_modes: ['FULL_WRITE'],
    automatic_retry: { allowed: false, max_attempts: null },
    idempotency: { identity: 'none', recovery: null, retention: null },
  },
  'POST /api/v1/apostas/lotes': {
    access_modes: ['FULL_WRITE'],
    automatic_retry: { allowed: true, max_attempts: 3 },
    idempotency: {
      identity: 'header:Idempotency-Key',
      recovery: 'GET /api/v1/apostas/lotes/intencao',
      retention: 'until_account_deletion',
    },
  },
  'GET /api/v1/apostas/lotes/intencao': {
    access_modes: ['FULL_WRITE', 'READ_ONLY'],
    automatic_retry: { allowed: true, max_attempts: 3 },
    idempotency: { identity: 'none', recovery: null, retention: null },
  },
  'GET /api/v1/apostas/lotes/previa-apagar': {
    access_modes: ['FULL_WRITE', 'READ_ONLY'],
    automatic_retry: { allowed: true, max_attempts: 3 },
    idempotency: { identity: 'none', recovery: null, retention: null },
  },
  'GET /api/v1/apostas/lotes/{lote_id}': {
    access_modes: ['FULL_WRITE', 'READ_ONLY'],
    automatic_retry: { allowed: true, max_attempts: 3 },
    idempotency: { identity: 'none', recovery: null, retention: null },
  },
  'POST /api/v1/apostas/lotes/{lote_id}/restaurar': {
    access_modes: ['FULL_WRITE'],
    automatic_retry: { allowed: true, max_attempts: 3 },
    idempotency: {
      identity: 'header:Idempotency-Key',
      recovery: 'GET /api/v1/apostas/lotes/intencao',
      retention: 'until_account_deletion',
    },
  },
  'GET /api/v1/apostas/{chave}': {
    access_modes: ['FULL_WRITE', 'READ_ONLY'],
    automatic_retry: { allowed: true, max_attempts: 3 },
    idempotency: { identity: 'none', recovery: null, retention: null },
  },
  'PATCH /api/v1/apostas/{chave}': {
    access_modes: ['FULL_WRITE'],
    automatic_retry: { allowed: false, max_attempts: null },
    idempotency: { identity: 'none', recovery: null, retention: null },
  },
  'DELETE /api/v1/apostas/{chave}': {
    access_modes: ['FULL_WRITE'],
    automatic_retry: { allowed: true, max_attempts: 3 },
    idempotency: {
      identity: 'path:chave',
      recovery: 'GET /api/v1/apostas/{chave}',
      retention: 'while_resource_exists',
    },
  },
  'GET /api/v1/apostas/{chave}/foto': {
    access_modes: ['FULL_WRITE', 'READ_ONLY'],
    automatic_retry: { allowed: true, max_attempts: 3 },
    idempotency: { identity: 'none', recovery: null, retention: null },
  },
  'PUT /api/v1/apostas/{chave}/grupos': {
    access_modes: ['FULL_WRITE'],
    automatic_retry: { allowed: false, max_attempts: null },
    idempotency: { identity: 'none', recovery: null, retention: null },
  },
  'POST /api/v1/apostas/{chave}/restaurar': {
    access_modes: ['FULL_WRITE'],
    automatic_retry: { allowed: true, max_attempts: 3 },
    idempotency: {
      identity: 'path:chave',
      recovery: 'GET /api/v1/apostas/{chave}',
      retention: 'while_resource_exists',
    },
  },
  'POST /api/v1/apostas/{chave}/resultado': {
    access_modes: ['FULL_WRITE'],
    automatic_retry: { allowed: false, max_attempts: null },
    idempotency: { identity: 'none', recovery: null, retention: null },
  },
  'GET /api/v1/bancas': {
    access_modes: ['FULL_WRITE', 'READ_ONLY'],
    automatic_retry: { allowed: true, max_attempts: 3 },
    idempotency: { identity: 'none', recovery: null, retention: null },
  },
  'POST /api/v1/bancas': {
    access_modes: ['FULL_WRITE'],
    automatic_retry: { allowed: true, max_attempts: 3 },
    idempotency: {
      identity: 'header:Idempotency-Key',
      recovery: 'GET /api/v1/bancas/intencao',
      retention: 'until_account_deletion',
    },
  },
  'GET /api/v1/bancas/intencao': {
    access_modes: ['FULL_WRITE', 'READ_ONLY'],
    automatic_retry: { allowed: true, max_attempts: 3 },
    idempotency: { identity: 'none', recovery: null, retention: null },
  },
  'PATCH /api/v1/bancas/{banca_id}': {
    access_modes: ['FULL_WRITE'],
    automatic_retry: { allowed: true, max_attempts: 3 },
    idempotency: {
      identity: 'header:Idempotency-Key',
      recovery: 'GET /api/v1/bancas/intencao',
      retention: 'until_account_deletion',
    },
  },
  'POST /api/v1/bancas/{banca_id}/arquivar': {
    access_modes: ['FULL_WRITE'],
    automatic_retry: { allowed: true, max_attempts: 3 },
    idempotency: {
      identity: 'header:Idempotency-Key',
      recovery: 'GET /api/v1/bancas/intencao',
      retention: 'until_account_deletion',
    },
  },
  'POST /api/v1/billing/cancel': {
    access_modes: ['FULL_WRITE', 'READ_ONLY'],
    automatic_retry: { allowed: false, max_attempts: null },
    idempotency: { identity: 'none', recovery: null, retention: null },
  },
  'POST /api/v1/billing/portal': {
    access_modes: ['FULL_WRITE', 'READ_ONLY'],
    automatic_retry: { allowed: false, max_attempts: null },
    idempotency: { identity: 'none', recovery: null, retention: null },
  },
  'GET /api/v1/billing/status': {
    access_modes: ['FULL_WRITE', 'READ_ONLY'],
    automatic_retry: { allowed: true, max_attempts: 3 },
    idempotency: { identity: 'none', recovery: null, retention: null },
  },
  'POST /api/v1/billing/subscribe': {
    access_modes: ['FULL_WRITE', 'READ_ONLY'],
    automatic_retry: { allowed: true, max_attempts: 3 },
    idempotency: {
      identity: 'header:Idempotency-Key',
      recovery: 'replay',
      retention: 'until_account_deletion',
    },
  },
  'POST /api/v1/billing/webhook': {
    access_modes: ['FULL_WRITE', 'READ_ONLY'],
    automatic_retry: { allowed: false, max_attempts: null },
    idempotency: { identity: 'none', recovery: null, retention: null },
  },
  'GET /api/v1/caixa': {
    access_modes: ['FULL_WRITE', 'READ_ONLY'],
    automatic_retry: { allowed: true, max_attempts: 3 },
    idempotency: { identity: 'none', recovery: null, retention: null },
  },
  'POST /api/v1/caixa': {
    access_modes: ['FULL_WRITE'],
    automatic_retry: { allowed: true, max_attempts: 3 },
    idempotency: {
      identity: 'header:Idempotency-Key',
      recovery: 'replay',
      retention: 'until_account_deletion',
    },
  },
  'PATCH /api/v1/caixa/contas/{conta_casa_id}/banca': {
    access_modes: ['FULL_WRITE'],
    automatic_retry: { allowed: false, max_attempts: null },
    idempotency: { identity: 'none', recovery: null, retention: null },
  },
  'GET /api/v1/caixa/extrato': {
    access_modes: ['FULL_WRITE', 'READ_ONLY'],
    automatic_retry: { allowed: true, max_attempts: 3 },
    idempotency: { identity: 'none', recovery: null, retention: null },
  },
  'GET /api/v1/caixa/saldo': {
    access_modes: ['FULL_WRITE', 'READ_ONLY'],
    automatic_retry: { allowed: true, max_attempts: 3 },
    idempotency: { identity: 'none', recovery: null, retention: null },
  },
  'POST /api/v1/calculadoras/cobertura-ao-vivo': {
    access_modes: ['FULL_WRITE', 'READ_ONLY'],
    automatic_retry: { allowed: true, max_attempts: 3 },
    idempotency: { identity: 'none', recovery: null, retention: null },
  },
  'POST /api/v1/calculadoras/distribuir-entre-resultados': {
    access_modes: ['FULL_WRITE', 'READ_ONLY'],
    automatic_retry: { allowed: true, max_attempts: 3 },
    idempotency: { identity: 'none', recovery: null, retention: null },
  },
  'POST /api/v1/calculadoras/mercado-justo': {
    access_modes: ['FULL_WRITE', 'READ_ONLY'],
    automatic_retry: { allowed: true, max_attempts: 3 },
    idempotency: { identity: 'none', recovery: null, retention: null },
  },
  'POST /api/v1/calculadoras/percentual-banca': {
    access_modes: ['FULL_WRITE', 'READ_ONLY'],
    automatic_retry: { allowed: true, max_attempts: 3 },
    idempotency: { identity: 'none', recovery: null, retention: null },
  },
  'POST /api/v1/catalogo/candidatos': {
    access_modes: ['FULL_WRITE', 'READ_ONLY'],
    automatic_retry: { allowed: false, max_attempts: null },
    idempotency: { identity: 'none', recovery: null, retention: null },
  },
  'POST /api/v1/coleta': {
    access_modes: ['FULL_WRITE'],
    automatic_retry: { allowed: false, max_attempts: null },
    idempotency: { identity: 'none', recovery: null, retention: null },
  },
  'POST /api/v1/coleta/batches': {
    access_modes: ['FULL_WRITE'],
    automatic_retry: { allowed: true, max_attempts: 3 },
    idempotency: {
      identity: 'body:batch_id',
      recovery: 'GET /api/v1/coleta/jobs/{job_id}',
      retention: 'until_account_deletion',
    },
  },
  'GET /api/v1/coleta/catalogo': {
    access_modes: ['FULL_WRITE', 'READ_ONLY'],
    automatic_retry: { allowed: true, max_attempts: 3 },
    idempotency: { identity: 'none', recovery: null, retention: null },
  },
  'GET /api/v1/coleta/contract': {
    access_modes: ['FULL_WRITE', 'READ_ONLY'],
    automatic_retry: { allowed: true, max_attempts: 3 },
    idempotency: { identity: 'none', recovery: null, retention: null },
  },
  'GET /api/v1/coleta/contract/schema': {
    access_modes: ['FULL_WRITE', 'READ_ONLY'],
    automatic_retry: { allowed: true, max_attempts: 3 },
    idempotency: { identity: 'none', recovery: null, retention: null },
  },
  'GET /api/v1/coleta/installations': {
    access_modes: ['FULL_WRITE', 'READ_ONLY'],
    automatic_retry: { allowed: true, max_attempts: 3 },
    idempotency: { identity: 'none', recovery: null, retention: null },
  },
  'DELETE /api/v1/coleta/installations/{instalacao_id}': {
    access_modes: ['FULL_WRITE', 'READ_ONLY'],
    automatic_retry: { allowed: false, max_attempts: null },
    idempotency: { identity: 'none', recovery: null, retention: null },
  },
  'POST /api/v1/coleta/installations/{instalacao_id}/rotate': {
    access_modes: ['FULL_WRITE', 'READ_ONLY'],
    automatic_retry: { allowed: false, max_attempts: null },
    idempotency: { identity: 'none', recovery: null, retention: null },
  },
  'GET /api/v1/coleta/jobs/{job_id}': {
    access_modes: ['FULL_WRITE', 'READ_ONLY'],
    automatic_retry: { allowed: true, max_attempts: 3 },
    idempotency: { identity: 'none', recovery: null, retention: null },
  },
  'POST /api/v1/coleta/pairing-codes': {
    access_modes: ['FULL_WRITE', 'READ_ONLY'],
    automatic_retry: { allowed: false, max_attempts: null },
    idempotency: { identity: 'none', recovery: null, retention: null },
  },
  'POST /api/v1/coleta/pairing-exchange': {
    access_modes: ['FULL_WRITE', 'READ_ONLY'],
    automatic_retry: { allowed: false, max_attempts: null },
    idempotency: { identity: 'none', recovery: null, retention: null },
  },
  'POST /api/v1/coleta/reader-captures': {
    access_modes: ['FULL_WRITE'],
    automatic_retry: { allowed: false, max_attempts: null },
    idempotency: { identity: 'none', recovery: null, retention: null },
  },
  'POST /api/v1/coleta/sessions': {
    access_modes: ['FULL_WRITE', 'READ_ONLY'],
    automatic_retry: { allowed: false, max_attempts: null },
    idempotency: { identity: 'none', recovery: null, retention: null },
  },
  'GET /api/v1/coleta/sessions/{sessao_id}': {
    access_modes: ['FULL_WRITE', 'READ_ONLY'],
    automatic_retry: { allowed: true, max_attempts: 3 },
    idempotency: { identity: 'none', recovery: null, retention: null },
  },
  'DELETE /api/v1/coleta/sessions/{sessao_id}': {
    access_modes: ['FULL_WRITE', 'READ_ONLY'],
    automatic_retry: { allowed: false, max_attempts: null },
    idempotency: { identity: 'none', recovery: null, retention: null },
  },
  'GET /api/v1/coleta/status': {
    access_modes: ['FULL_WRITE', 'READ_ONLY'],
    automatic_retry: { allowed: true, max_attempts: 3 },
    idempotency: { identity: 'none', recovery: null, retention: null },
  },
  'POST /api/v1/consolidacoes': {
    access_modes: ['FULL_WRITE'],
    automatic_retry: { allowed: false, max_attempts: null },
    idempotency: { identity: 'none', recovery: null, retention: null },
  },
  'POST /api/v1/consolidacoes/{relacao_id}/desvincular': {
    access_modes: ['FULL_WRITE'],
    automatic_retry: { allowed: false, max_attempts: null },
    idempotency: { identity: 'none', recovery: null, retention: null },
  },
  'GET /api/v1/filtros/{dimensao}': {
    access_modes: ['FULL_WRITE', 'READ_ONLY'],
    automatic_retry: { allowed: true, max_attempts: 3 },
    idempotency: { identity: 'none', recovery: null, retention: null },
  },
  'GET /api/v1/financeiro/nativo/apostas': {
    access_modes: ['FULL_WRITE', 'READ_ONLY'],
    automatic_retry: { allowed: true, max_attempts: 3 },
    idempotency: { identity: 'none', recovery: null, retention: null },
  },
  'GET /api/v1/financeiro/nativo/contas': {
    access_modes: ['FULL_WRITE', 'READ_ONLY'],
    automatic_retry: { allowed: true, max_attempts: 3 },
    idempotency: { identity: 'none', recovery: null, retention: null },
  },
  'POST /api/v1/financeiro/nativo/contas': {
    access_modes: ['FULL_WRITE'],
    automatic_retry: { allowed: false, max_attempts: null },
    idempotency: { identity: 'none', recovery: null, retention: null },
  },
  'GET /api/v1/financeiro/nativo/resumo': {
    access_modes: ['FULL_WRITE', 'READ_ONLY'],
    automatic_retry: { allowed: true, max_attempts: 3 },
    idempotency: { identity: 'none', recovery: null, retention: null },
  },
  'POST /api/v1/grupos': {
    access_modes: ['FULL_WRITE'],
    automatic_retry: { allowed: false, max_attempts: null },
    idempotency: { identity: 'none', recovery: null, retention: null },
  },
  'PATCH /api/v1/grupos/{grupo_id}': {
    access_modes: ['FULL_WRITE'],
    automatic_retry: { allowed: false, max_attempts: null },
    idempotency: { identity: 'none', recovery: null, retention: null },
  },
  'POST /api/v1/integrations/telegram/webhook': {
    access_modes: ['FULL_WRITE', 'READ_ONLY'],
    automatic_retry: { allowed: false, max_attempts: null },
    idempotency: { identity: 'none', recovery: null, retention: null },
  },
  'GET /api/v1/painel': {
    access_modes: ['FULL_WRITE', 'READ_ONLY'],
    automatic_retry: { allowed: true, max_attempts: 3 },
    idempotency: { identity: 'none', recovery: null, retention: null },
  },
  'GET /api/v1/painel/analises': {
    access_modes: ['FULL_WRITE', 'READ_ONLY'],
    automatic_retry: { allowed: true, max_attempts: 3 },
    idempotency: { identity: 'none', recovery: null, retention: null },
  },
  'GET /api/v1/painel/export': {
    access_modes: ['FULL_WRITE', 'READ_ONLY'],
    automatic_retry: { allowed: true, max_attempts: 3 },
    idempotency: { identity: 'none', recovery: null, retention: null },
  },
  'GET /api/v1/painel/filtrado': {
    access_modes: ['FULL_WRITE', 'READ_ONLY'],
    automatic_retry: { allowed: true, max_attempts: 3 },
    idempotency: { identity: 'none', recovery: null, retention: null },
  },
  'GET /api/v1/painel/filtrado/detalhado/export': {
    access_modes: ['FULL_WRITE', 'READ_ONLY'],
    automatic_retry: { allowed: true, max_attempts: 3 },
    idempotency: { identity: 'none', recovery: null, retention: null },
  },
  'GET /api/v1/painel/filtrado/diario': {
    access_modes: ['FULL_WRITE', 'READ_ONLY'],
    automatic_retry: { allowed: true, max_attempts: 3 },
    idempotency: { identity: 'none', recovery: null, retention: null },
  },
  'GET /api/v1/painel/filtrado/export': {
    access_modes: ['FULL_WRITE', 'READ_ONLY'],
    automatic_retry: { allowed: true, max_attempts: 3 },
    idempotency: { identity: 'none', recovery: null, retention: null },
  },
  'GET /api/v1/painel/filtrado/grupos': {
    access_modes: ['FULL_WRITE', 'READ_ONLY'],
    automatic_retry: { allowed: true, max_attempts: 3 },
    idempotency: { identity: 'none', recovery: null, retention: null },
  },
  'GET /api/v1/painel/filtrado/metricas': {
    access_modes: ['FULL_WRITE', 'READ_ONLY'],
    automatic_retry: { allowed: true, max_attempts: 3 },
    idempotency: { identity: 'none', recovery: null, retention: null },
  },
  'GET /api/v1/painel/hipotetica': {
    access_modes: ['FULL_WRITE', 'READ_ONLY'],
    automatic_retry: { allowed: true, max_attempts: 3 },
    idempotency: { identity: 'none', recovery: null, retention: null },
  },
  'GET /api/v1/painel/metas': {
    access_modes: ['FULL_WRITE', 'READ_ONLY'],
    automatic_retry: { allowed: true, max_attempts: 3 },
    idempotency: { identity: 'none', recovery: null, retention: null },
  },
  'POST /api/v1/painel/metas': {
    access_modes: ['FULL_WRITE'],
    automatic_retry: { allowed: false, max_attempts: null },
    idempotency: { identity: 'none', recovery: null, retention: null },
  },
  'GET /api/v1/painel/metas/{meta_id}': {
    access_modes: ['FULL_WRITE', 'READ_ONLY'],
    automatic_retry: { allowed: true, max_attempts: 3 },
    idempotency: { identity: 'none', recovery: null, retention: null },
  },
  'PATCH /api/v1/painel/metas/{meta_id}': {
    access_modes: ['FULL_WRITE'],
    automatic_retry: { allowed: false, max_attempts: null },
    idempotency: { identity: 'none', recovery: null, retention: null },
  },
  'DELETE /api/v1/painel/metas/{meta_id}': {
    access_modes: ['FULL_WRITE'],
    automatic_retry: { allowed: false, max_attempts: null },
    idempotency: { identity: 'none', recovery: null, retention: null },
  },
  'GET /api/v1/painel/metricas': {
    access_modes: ['FULL_WRITE', 'READ_ONLY'],
    automatic_retry: { allowed: true, max_attempts: 3 },
    idempotency: { identity: 'none', recovery: null, retention: null },
  },
  'GET /api/v1/painel/preferencias': {
    access_modes: ['FULL_WRITE', 'READ_ONLY'],
    automatic_retry: { allowed: true, max_attempts: 3 },
    idempotency: { identity: 'none', recovery: null, retention: null },
  },
  'PATCH /api/v1/painel/preferencias': {
    access_modes: ['FULL_WRITE'],
    automatic_retry: { allowed: false, max_attempts: null },
    idempotency: { identity: 'none', recovery: null, retention: null },
  },
  'GET /api/v1/planilhas/campos': {
    access_modes: ['FULL_WRITE', 'READ_ONLY'],
    automatic_retry: { allowed: true, max_attempts: 3 },
    idempotency: { identity: 'none', recovery: null, retention: null },
  },
  'GET /api/v1/planilhas/confirmacoes/{confirmation_id}': {
    access_modes: ['FULL_WRITE', 'READ_ONLY'],
    automatic_retry: { allowed: true, max_attempts: 3 },
    idempotency: { identity: 'none', recovery: null, retention: null },
  },
  'POST /api/v1/planilhas/confirmacoes/{confirmation_id}': {
    access_modes: ['FULL_WRITE'],
    automatic_retry: { allowed: false, max_attempts: null },
    idempotency: {
      identity: 'path:confirmation_id',
      recovery: 'GET /api/v1/planilhas/confirmacoes/{confirmation_id}',
      retention: 'until_account_deletion',
    },
  },
  'GET /api/v1/planilhas/fontes': {
    access_modes: ['FULL_WRITE', 'READ_ONLY'],
    automatic_retry: { allowed: true, max_attempts: 3 },
    idempotency: { identity: 'none', recovery: null, retention: null },
  },
  'GET /api/v1/planilhas/fontes/{source_id}': {
    access_modes: ['FULL_WRITE', 'READ_ONLY'],
    automatic_retry: { allowed: true, max_attempts: 3 },
    idempotency: { identity: 'none', recovery: null, retention: null },
  },
  'PUT /api/v1/planilhas/fontes/{source_id}': {
    access_modes: ['FULL_WRITE'],
    automatic_retry: { allowed: false, max_attempts: null },
    idempotency: {
      identity: 'path:source_id',
      recovery: 'GET /api/v1/planilhas/fontes/{source_id}',
      retention: 'until_account_deletion',
    },
  },
  'POST /api/v1/planilhas/fontes/{source_id}/previas/{preview_id}': {
    access_modes: ['FULL_WRITE'],
    automatic_retry: { allowed: false, max_attempts: null },
    idempotency: {
      identity: 'path:preview_id',
      recovery: 'GET /api/v1/planilhas/previas/{preview_id}',
      retention: 'until_account_deletion',
    },
  },
  'GET /api/v1/planilhas/previas/{preview_id}': {
    access_modes: ['FULL_WRITE', 'READ_ONLY'],
    automatic_retry: { allowed: true, max_attempts: 3 },
    idempotency: { identity: 'none', recovery: null, retention: null },
  },
  'GET /api/v1/planilhas/previas/{preview_id}/linhas': {
    access_modes: ['FULL_WRITE', 'READ_ONLY'],
    automatic_retry: { allowed: true, max_attempts: 3 },
    idempotency: { identity: 'none', recovery: null, retention: null },
  },
  'POST /api/v1/planilhas/previas/{preview_id}/remapear/{new_preview_id}': {
    access_modes: ['FULL_WRITE'],
    automatic_retry: { allowed: false, max_attempts: null },
    idempotency: {
      identity: 'path:new_preview_id',
      recovery: 'GET /api/v1/planilhas/previas/{preview_id}',
      retention: 'until_account_deletion',
    },
  },
  'GET /api/v1/prints/intencoes/{intent_id}': {
    access_modes: ['FULL_WRITE', 'READ_ONLY'],
    automatic_retry: { allowed: true, max_attempts: 3 },
    idempotency: { identity: 'none', recovery: null, retention: null },
  },
  'GET /api/v1/prints/intencoes/{intent_id}/itens/{item_id}': {
    access_modes: ['FULL_WRITE', 'READ_ONLY'],
    automatic_retry: { allowed: true, max_attempts: 3 },
    idempotency: { identity: 'none', recovery: null, retention: null },
  },
  'POST /api/v1/prints/intencoes/{intent_id}/itens/{item_id}': {
    access_modes: ['FULL_WRITE'],
    automatic_retry: { allowed: false, max_attempts: null },
    idempotency: {
      identity: 'path:item_id',
      recovery: 'GET /api/v1/prints/intencoes/{intent_id}/itens/{item_id}',
      retention: 'while_resource_exists',
    },
  },
  'POST /api/v1/prints/intencoes/{intent_id}/itens/{item_id}/retry': {
    access_modes: ['FULL_WRITE'],
    automatic_retry: { allowed: false, max_attempts: null },
    idempotency: {
      identity: 'body:retry_id',
      recovery: 'GET /api/v1/prints/intencoes/{intent_id}/itens/{item_id}',
      retention: 'while_resource_exists',
    },
  },
  'POST /api/v1/prints/revisoes/{revisao_id}/resolver': {
    access_modes: ['FULL_WRITE'],
    automatic_retry: { allowed: false, max_attempts: null },
    idempotency: { identity: 'none', recovery: null, retention: null },
  },
  'GET /api/v1/resultados/apostas/{chave}': {
    access_modes: ['FULL_WRITE', 'READ_ONLY'],
    automatic_retry: { allowed: true, max_attempts: 3 },
    idempotency: { identity: 'none', recovery: null, retention: null },
  },
  'GET /api/v1/resultados/fila': {
    access_modes: ['FULL_WRITE', 'READ_ONLY'],
    automatic_retry: { allowed: true, max_attempts: 3 },
    idempotency: { identity: 'none', recovery: null, retention: null },
  },
  'GET /api/v1/resultados/operacoes/{intention_id}': {
    access_modes: ['FULL_WRITE', 'READ_ONLY'],
    automatic_retry: { allowed: true, max_attempts: 3 },
    idempotency: { identity: 'none', recovery: null, retention: null },
  },
  'POST /api/v1/resultados/operacoes/{intention_id}': {
    access_modes: ['FULL_WRITE'],
    automatic_retry: { allowed: false, max_attempts: null },
    idempotency: {
      identity: 'path:intention_id',
      recovery: 'GET /api/v1/resultados/operacoes/{intention_id}',
      retention: 'until_account_deletion',
    },
  },
  'POST /api/v1/resultados/operacoes/{intention_id}/desfazer': {
    access_modes: ['FULL_WRITE'],
    automatic_retry: { allowed: false, max_attempts: null },
    idempotency: {
      identity: 'path:intention_id',
      recovery: 'GET /api/v1/resultados/operacoes/{intention_id}',
      retention: 'until_account_deletion',
    },
  },
  'GET /api/v1/revisao': {
    access_modes: ['FULL_WRITE', 'READ_ONLY'],
    automatic_retry: { allowed: true, max_attempts: 3 },
    idempotency: { identity: 'none', recovery: null, retention: null },
  },
  'GET /api/v1/revisao-operacional/fila': {
    access_modes: ['FULL_WRITE', 'READ_ONLY'],
    automatic_retry: { allowed: true, max_attempts: 3 },
    idempotency: { identity: 'none', recovery: null, retention: null },
  },
  'GET /api/v1/revisao-operacional/operacoes/{operacao_id}': {
    access_modes: ['FULL_WRITE', 'READ_ONLY'],
    automatic_retry: { allowed: true, max_attempts: 3 },
    idempotency: { identity: 'none', recovery: null, retention: null },
  },
  'POST /api/v1/revisao-operacional/operacoes/{operacao_id}': {
    access_modes: ['FULL_WRITE'],
    automatic_retry: { allowed: false, max_attempts: null },
    idempotency: {
      identity: 'path:operacao_id',
      recovery: 'GET /api/v1/revisao-operacional/operacoes/{operacao_id}',
      retention: 'until_account_deletion',
    },
  },
  'GET /api/v1/revisao-operacional/revisoes/{revisao_id}': {
    access_modes: ['FULL_WRITE', 'READ_ONLY'],
    automatic_retry: { allowed: true, max_attempts: 3 },
    idempotency: { identity: 'none', recovery: null, retention: null },
  },
  'GET /api/v1/revisao-operacional/revisoes/{revisao_id}/foto': {
    access_modes: ['FULL_WRITE', 'READ_ONLY'],
    automatic_retry: { allowed: true, max_attempts: 3 },
    idempotency: { identity: 'none', recovery: null, retention: null },
  },
  'GET /api/v1/revisao/stats': {
    access_modes: ['FULL_WRITE', 'READ_ONLY'],
    automatic_retry: { allowed: true, max_attempts: 3 },
    idempotency: { identity: 'none', recovery: null, retention: null },
  },
  'GET /api/v1/revisao/{revisao_id}': {
    access_modes: ['FULL_WRITE', 'READ_ONLY'],
    automatic_retry: { allowed: true, max_attempts: 3 },
    idempotency: { identity: 'none', recovery: null, retention: null },
  },
  'GET /api/v1/revisao/{revisao_id}/foto': {
    access_modes: ['FULL_WRITE', 'READ_ONLY'],
    automatic_retry: { allowed: true, max_attempts: 3 },
    idempotency: { identity: 'none', recovery: null, retention: null },
  },
  'POST /api/v1/revisao/{revisao_id}/resolver': {
    access_modes: ['FULL_WRITE'],
    automatic_retry: { allowed: false, max_attempts: null },
    idempotency: { identity: 'none', recovery: null, retention: null },
  },
  'GET /api/v1/telegram/link': {
    access_modes: ['FULL_WRITE', 'READ_ONLY'],
    automatic_retry: { allowed: true, max_attempts: 3 },
    idempotency: { identity: 'none', recovery: null, retention: null },
  },
  'DELETE /api/v1/telegram/link': {
    access_modes: ['FULL_WRITE', 'READ_ONLY'],
    automatic_retry: { allowed: false, max_attempts: null },
    idempotency: { identity: 'none', recovery: null, retention: null },
  },
  'POST /api/v1/telegram/link-codes': {
    access_modes: ['FULL_WRITE', 'READ_ONLY'],
    automatic_retry: { allowed: false, max_attempts: null },
    idempotency: { identity: 'none', recovery: null, retention: null },
  },
  'GET /api/v1/titulares': {
    access_modes: ['FULL_WRITE', 'READ_ONLY'],
    automatic_retry: { allowed: true, max_attempts: 3 },
    idempotency: { identity: 'none', recovery: null, retention: null },
  },
  'POST /api/v1/titulares': {
    access_modes: ['FULL_WRITE'],
    automatic_retry: { allowed: false, max_attempts: null },
    idempotency: { identity: 'none', recovery: null, retention: null },
  },
  'GET /api/v1/titulares/casas/{casa_id}/matriz': {
    access_modes: ['FULL_WRITE', 'READ_ONLY'],
    automatic_retry: { allowed: true, max_attempts: 3 },
    idempotency: { identity: 'none', recovery: null, retention: null },
  },
  'GET /api/v1/titulares/financeiro': {
    access_modes: ['FULL_WRITE', 'READ_ONLY'],
    automatic_retry: { allowed: true, max_attempts: 3 },
    idempotency: { identity: 'none', recovery: null, retention: null },
  },
  'POST /api/v1/titulares/trocas': {
    access_modes: ['FULL_WRITE'],
    automatic_retry: { allowed: true, max_attempts: 3 },
    idempotency: {
      identity: 'header:Idempotency-Key',
      recovery: 'replay',
      retention: 'until_account_deletion',
    },
  },
  'GET /api/v1/titulares/trocas/intencao': {
    access_modes: ['FULL_WRITE', 'READ_ONLY'],
    automatic_retry: { allowed: true, max_attempts: 3 },
    idempotency: { identity: 'none', recovery: null, retention: null },
  },
  'POST /api/v1/titulares/trocas/preview': {
    access_modes: ['FULL_WRITE'],
    automatic_retry: { allowed: true, max_attempts: 3 },
    idempotency: {
      identity: 'header:Idempotency-Key',
      recovery: 'replay',
      retention: 'until_account_deletion',
    },
  },
  'GET /api/v1/titulares/{titular_id}': {
    access_modes: ['FULL_WRITE', 'READ_ONLY'],
    automatic_retry: { allowed: true, max_attempts: 3 },
    idempotency: { identity: 'none', recovery: null, retention: null },
  },
  'PATCH /api/v1/titulares/{titular_id}': {
    access_modes: ['FULL_WRITE'],
    automatic_retry: { allowed: false, max_attempts: null },
    idempotency: { identity: 'none', recovery: null, retention: null },
  },
  'DELETE /api/v1/titulares/{titular_id}': {
    access_modes: ['FULL_WRITE'],
    automatic_retry: { allowed: false, max_attempts: null },
    idempotency: { identity: 'none', recovery: null, retention: null },
  },
  'POST /api/v1/titulares/{titular_id}/contas': {
    access_modes: ['FULL_WRITE'],
    automatic_retry: { allowed: false, max_attempts: null },
    idempotency: { identity: 'none', recovery: null, retention: null },
  },
  'PATCH /api/v1/titulares/{titular_id}/contas/{conta_id}': {
    access_modes: ['FULL_WRITE'],
    automatic_retry: { allowed: false, max_attempts: null },
    idempotency: { identity: 'none', recovery: null, retention: null },
  },
  'POST /api/v1/titulares/{titular_id}/contas/{conta_id}/ativar': {
    access_modes: ['FULL_WRITE'],
    automatic_retry: { allowed: false, max_attempts: null },
    idempotency: { identity: 'none', recovery: null, retention: null },
  },
  'GET /api/v1/titulares/{titular_id}/matriz': {
    access_modes: ['FULL_WRITE', 'READ_ONLY'],
    automatic_retry: { allowed: true, max_attempts: 3 },
    idempotency: { identity: 'none', recovery: null, retention: null },
  },
  'GET /api/v1/unidade': {
    access_modes: ['FULL_WRITE', 'READ_ONLY'],
    automatic_retry: { allowed: true, max_attempts: 3 },
    idempotency: { identity: 'none', recovery: null, retention: null },
  },
  'POST /api/v1/unidade/vigencias': {
    access_modes: ['FULL_WRITE'],
    automatic_retry: { allowed: true, max_attempts: 3 },
    idempotency: {
      identity: 'header:Idempotency-Key',
      recovery: 'GET /api/v1/unidade/vigencias/intencao',
      retention: 'while_resource_exists',
    },
  },
  'GET /api/v1/unidade/vigencias/intencao': {
    access_modes: ['FULL_WRITE', 'READ_ONLY'],
    automatic_retry: { allowed: true, max_attempts: 3 },
    idempotency: { identity: 'none', recovery: null, retention: null },
  },
  'POST /api/v1/upload': {
    access_modes: ['FULL_WRITE'],
    automatic_retry: { allowed: false, max_attempts: null },
    idempotency: { identity: 'none', recovery: null, retention: null },
  },
  'GET /api/v1/upload/{job_id}': {
    access_modes: ['FULL_WRITE', 'READ_ONLY'],
    automatic_retry: { allowed: true, max_attempts: 3 },
    idempotency: { identity: 'none', recovery: null, retention: null },
  },
  'DELETE /api/v1/usuario/me': {
    access_modes: ['FULL_WRITE', 'READ_ONLY'],
    automatic_retry: { allowed: false, max_attempts: null },
    idempotency: { identity: 'none', recovery: null, retention: null },
  },
  'GET /api/v1/usuario/me/export': {
    access_modes: ['FULL_WRITE', 'READ_ONLY'],
    automatic_retry: { allowed: true, max_attempts: 3 },
    idempotency: { identity: 'none', recovery: null, retention: null },
  },
  'GET /auth/callback': {
    access_modes: ['FULL_WRITE', 'READ_ONLY'],
    automatic_retry: { allowed: false, max_attempts: null },
    idempotency: { identity: 'none', recovery: null, retention: null },
  },
  'GET /auth/jwks': {
    access_modes: ['FULL_WRITE', 'READ_ONLY'],
    automatic_retry: { allowed: true, max_attempts: 3 },
    idempotency: { identity: 'none', recovery: null, retention: null },
  },
  'POST /auth/logout': {
    access_modes: ['FULL_WRITE', 'READ_ONLY'],
    automatic_retry: { allowed: false, max_attempts: null },
    idempotency: { identity: 'none', recovery: null, retention: null },
  },
  'POST /auth/refresh': {
    access_modes: ['FULL_WRITE', 'READ_ONLY'],
    automatic_retry: { allowed: false, max_attempts: null },
    idempotency: { identity: 'none', recovery: null, retention: null },
  },
  'GET /auth/session': {
    access_modes: ['FULL_WRITE', 'READ_ONLY'],
    automatic_retry: { allowed: true, max_attempts: 3 },
    idempotency: { identity: 'none', recovery: null, retention: null },
  },
  'GET /auth/start': {
    access_modes: ['FULL_WRITE', 'READ_ONLY'],
    automatic_retry: { allowed: false, max_attempts: null },
    idempotency: { identity: 'none', recovery: null, retention: null },
  },
  'POST /coleta': {
    access_modes: ['FULL_WRITE'],
    automatic_retry: { allowed: false, max_attempts: null },
    idempotency: { identity: 'none', recovery: null, retention: null },
  },
  'GET /health': {
    access_modes: ['FULL_WRITE', 'READ_ONLY'],
    automatic_retry: { allowed: true, max_attempts: 3 },
    idempotency: { identity: 'none', recovery: null, retention: null },
  },
  'GET /metrics': {
    access_modes: ['FULL_WRITE', 'READ_ONLY'],
    automatic_retry: { allowed: true, max_attempts: 3 },
    idempotency: { identity: 'none', recovery: null, retention: null },
  },
  'GET /ready': {
    access_modes: ['FULL_WRITE', 'READ_ONLY'],
    automatic_retry: { allowed: true, max_attempts: 3 },
    idempotency: { identity: 'none', recovery: null, retention: null },
  },
} as const;

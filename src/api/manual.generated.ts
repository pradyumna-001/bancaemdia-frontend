// Generated from x-idempotency in the same verified OpenAPI.
export const MANUAL_POLICIES = {
  automatic_retry: false,
  expired_identity_reusable: false,
  identity: 'path.intencao_id',
  retention_days: 90,
  scope: 'authenticated_user',
  get_permission: 'READ_ONLY',
  get_automatic_retry: false,
} as const;

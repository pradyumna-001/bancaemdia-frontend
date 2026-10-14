import { ApiError } from './error';

// OpenAPI schema metadata, generated alongside the types. These are not response shapes.
export type Regra = Readonly<{
  type?: string;
  required?: readonly string[];
  enum?: readonly unknown[];
  const?: unknown;
  pattern?: string;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  anyOf?: readonly Regra[];
  oneOf?: readonly Regra[];
  items?: Regra;
  properties?: Readonly<Record<string, Regra>>;
  additionalProperties?: Regra;
  json?: boolean;
}>;
export type ContratoLeitura = Readonly<
  Record<
    string,
    Readonly<{
      query: Readonly<Record<string, Regra>>;
      response?: Regra;
    }>
  >
>;

export function objeto(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new ApiError('invalid_response');
  return value as Record<string, unknown>;
}

export function corresponde(value: unknown, rule: Regra): boolean {
  if (rule.json) return jsonValue(value);
  if (rule.anyOf) return rule.anyOf.some((part) => corresponde(value, part));
  if (rule.oneOf)
    return rule.oneOf.filter((part) => corresponde(value, part)).length === 1;
  if (rule.const !== undefined && value !== rule.const) return false;
  if (rule.enum && !rule.enum.includes(value)) return false;
  if (rule.type === 'null') return value === null;
  if (rule.type === 'object') {
    if (!value || typeof value !== 'object' || Array.isArray(value))
      return false;
    const record = value as Record<string, unknown>;
    return (
      (rule.required ?? []).every((key) => Object.hasOwn(record, key)) &&
      (!rule.additionalProperties ||
        Object.entries(record).every(
          ([key, item]) =>
            Object.hasOwn(rule.properties ?? {}, key) ||
            corresponde(item, rule.additionalProperties!),
        )) &&
      Object.entries(rule.properties ?? {}).every(
        ([key, part]) =>
          !Object.hasOwn(record, key) || corresponde(record[key], part),
      )
    );
  }
  if (rule.type === 'array')
    return (
      Array.isArray(value) &&
      !!rule.items &&
      value.every((item) => corresponde(item, rule.items!))
    );
  if (rule.type === 'integer' || rule.type === 'number')
    return (
      typeof value === 'number' &&
      Number.isFinite(value) &&
      (rule.type !== 'integer' || Number.isSafeInteger(value)) &&
      (rule.minimum === undefined || value >= rule.minimum) &&
      (rule.maximum === undefined || value <= rule.maximum)
    );
  if (rule.type === 'string')
    return (
      typeof value === 'string' &&
      (rule.minLength === undefined || value.length >= rule.minLength) &&
      (rule.maxLength === undefined || value.length <= rule.maxLength) &&
      (!rule.pattern || new RegExp(rule.pattern).test(value))
    );
  if (rule.type === 'boolean') return typeof value === 'boolean';
  return false;
}

function jsonValue(value: unknown, depth = 0): boolean {
  if (depth > 32) return false;
  if (value === null || typeof value === 'string' || typeof value === 'boolean')
    return true;
  if (typeof value === 'number') return Number.isFinite(value);
  if (Array.isArray(value))
    return value.every((item) => jsonValue(item, depth + 1));
  if (value && typeof value === 'object')
    return Object.values(value).every((item) => jsonValue(item, depth + 1));
  return false;
}

export function respostaPublicada(
  value: unknown,
  rule: Regra | undefined,
): Record<string, unknown> {
  if (!rule || !corresponde(value, rule))
    throw new ApiError('invalid_response');
  return objeto(value);
}

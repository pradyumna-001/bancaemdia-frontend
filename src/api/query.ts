import { PAGINATION_RULES } from './operations.generated';

// Only syntax/limits published by this snapshot. Resource-specific filter adapters are #17.
export function paginacaoConsulta(
  operation: keyof typeof PAGINATION_RULES,
  search: URLSearchParams,
) {
  const rules: { page: IntegerRule; page_size: IntegerRule } =
    PAGINATION_RULES[operation];
  return {
    page: integerParam(search, 'page', rules.page),
    page_size: integerParam(search, 'page_size', rules.page_size),
  };
}
type IntegerRule = Readonly<{
  default: number;
  minimum: number;
  maximum?: number;
}>;

function integerParam(
  search: URLSearchParams,
  name: string,
  rule: IntegerRule,
): number {
  const values = search.getAll(name);
  const raw = values[0];
  if (values.length !== 1 || !raw || !/^\d+$/.test(raw)) return rule.default;
  const value = Number(raw);
  return Number.isSafeInteger(value) &&
    value >= rule.minimum &&
    (rule.maximum === undefined || value <= rule.maximum)
    ? value
    : rule.default;
}

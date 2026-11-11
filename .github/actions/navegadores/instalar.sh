#!/usr/bin/env bash
# Install Playwright browsers with bounded, logged attempts (#125).
# Only this infrastructure step is repeated: a hung apt mirror or download
# used to exhaust the whole job before any test ran. Tests and performance
# samples are never repeated here.
set -euo pipefail

read -r -a browsers <<< "${BROWSERS:-}"
if [ "${TOOL:-python}" = pnpm ]; then
  command=(pnpm exec playwright install)
else
  command=(python -m playwright install)
fi
if [ "${WITH_DEPS:-true}" = true ]; then
  command+=(--with-deps)
fi
limit="${ATTEMPT_SECONDS:-300}"

for attempt in 1 2 3; do
  start=$(date +%s)
  set +e
  timeout "$limit" "${command[@]}" "${browsers[@]}"
  code=$?
  set -e
  elapsed=$(( $(date +%s) - start ))
  if [ "$code" -eq 0 ]; then
    echo "Navegadores prontos na tentativa $attempt (${elapsed}s)."
    exit 0
  fi
  reason=$([ "$code" -eq 124 ] && echo "prazo de ${limit}s esgotado" || echo "código de saída $code")
  echo "::warning title=Instalação de navegadores (#125)::Tentativa $attempt sem sucesso após ${elapsed}s: $reason. Nenhum teste foi executado; repetindo só a instalação."
  sleep 20
done
echo "::error title=Instalação de navegadores (#125)::Três tentativas de instalação falharam. Nenhum teste foi executado."
exit 1

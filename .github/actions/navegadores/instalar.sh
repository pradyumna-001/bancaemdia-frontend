#!/usr/bin/env bash
# Install Playwright browsers with bounded, logged attempts (#125).
# Only this infrastructure step is repeated: a hung apt mirror or download
# used to exhaust the whole job before any test ran. Tests and performance
# samples are never repeated here.
set -euo pipefail

read -r -a browsers <<< "${BROWSERS:-}"
if [ "${TOOL:-python}" = pnpm ]; then
  playwright=(pnpm exec playwright)
else
  playwright=(python -m playwright)
fi
limit="${ATTEMPT_SECONDS:-300}"

# A timeout can stop apt in the middle of dpkg; the next apt run then refuses
# with code 100 until dpkg is repaired. Repair and wait for the apt locks
# before any new attempt, so a retry really retries.
repair_apt() {
  command -v dpkg > /dev/null || return 0
  for lock in /var/lib/dpkg/lock-frontend /var/lib/dpkg/lock /var/lib/apt/lists/lock; do
    for _ in $(seq 1 60); do
      sudo fuser "$lock" > /dev/null 2>&1 || break
      sleep 2
    done
  done
  sudo dpkg --configure -a || true
}

attempt() {
  local step="$1"
  shift
  for n in 1 2 3; do
    local start code elapsed reason
    start=$(date +%s)
    set +e
    timeout "$limit" "$@"
    code=$?
    set -e
    elapsed=$(( $(date +%s) - start ))
    if [ "$code" -eq 0 ]; then
      echo "$step pronto na tentativa $n (${elapsed}s)."
      return 0
    fi
    reason=$([ "$code" -eq 124 ] && echo "prazo de ${limit}s esgotado" || echo "código de saída $code")
    echo "::warning title=Instalação de navegadores (#125)::$step: tentativa $n sem sucesso após ${elapsed}s: $reason. Nenhum teste foi executado; repetindo só esta instalação."
    repair_apt
    sleep 20
  done
  echo "::error title=Instalação de navegadores (#125)::$step: três tentativas falharam. Nenhum teste foi executado."
  return 1
}

if [ "${WITH_DEPS:-true}" = true ]; then
  attempt "Dependências do sistema" "${playwright[@]}" install-deps "${browsers[@]}"
fi
attempt "Navegadores" "${playwright[@]}" install "${browsers[@]}"

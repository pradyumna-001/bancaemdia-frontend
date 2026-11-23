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
# with code 100 until dpkg is repaired. `timeout` only stops the installer it
# started: the root apt-get it spawned keeps running and holding the dpkg
# lock, so every later attempt failed at once. Wait for the locks; if they are
# still held, stop that abandoned apt (this runner is disposable), then repair
# dpkg, so a retry really retries.
LOCKS=(/var/lib/dpkg/lock-frontend /var/lib/dpkg/lock /var/lib/apt/lists/lock /var/cache/apt/archives/lock)
locks_held() {
  local lock
  for lock in "${LOCKS[@]}"; do
    sudo fuser "$lock" > /dev/null 2>&1 && return 0
  done
  return 1
}
repair_apt() {
  command -v dpkg > /dev/null || return 0
  for _ in $(seq 1 30); do
    locks_held || break
    sleep 2
  done
  if locks_held; then
    echo "::warning title=Instalação de navegadores (#125)::O apt da tentativa anterior ainda segura a trava do dpkg; encerrando-o antes de reparar."
    for signal in TERM KILL; do
      for lock in "${LOCKS[@]}"; do
        sudo fuser -k "-$signal" "$lock" > /dev/null 2>&1 || true
      done
      sleep 5
      locks_held || break
    done
  fi
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

# Downloaded .deb files are kept between runs (see action.yml): restored into
# apt's own archive before installing, saved back after a successful install.
# apt checks each file against the index, so a stale one is simply downloaded
# again; nothing installed differs from a run without the cache.
cache="${APT_CACHE:-}"
cache="${cache/#\~/$HOME}"
archives="${APT_ARCHIVES:-/var/cache/apt/archives}"
apt_conf="${APT_CONF_DIR:-/etc/apt/apt.conf.d}/99manter-pacotes-navegadores"
restore_debs() {
  [ -n "$cache" ] && command -v dpkg > /dev/null || return 0
  # apt-get keeps what it downloads, unless an image setting cleans it.
  echo 'APT::Keep-Downloaded-Packages "true"; Binary::apt::APT::Keep-Downloaded-Packages "true";' |
    sudo tee "$apt_conf" > /dev/null
  mkdir -p "$cache"
  local count
  count=$(find "$cache" -maxdepth 1 -name '*.deb' | wc -l)
  if [ "$count" -gt 0 ]; then
    sudo cp -n "$cache"/*.deb "$archives"/
  fi
  echo "Pacotes do sistema restaurados do cache: $count."
}
save_debs() {
  [ -n "$cache" ] && command -v dpkg > /dev/null || return 0
  local count
  count=$(find "$archives" -maxdepth 1 -name '*.deb' | wc -l)
  if [ "$count" -gt 0 ]; then
    cp -n "$archives"/*.deb "$cache"/
  fi
  echo "Pacotes do sistema guardados para o cache: $count."
}

if [ "${WITH_DEPS:-true}" = true ]; then
  restore_debs
  attempt "Dependências do sistema" "${playwright[@]}" install-deps "${browsers[@]}"
  save_debs
fi
attempt "Navegadores" "${playwright[@]}" install "${browsers[@]}"

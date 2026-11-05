#!/usr/bin/env bash
# Атомарный деплой dist/: releases/<ts> + симлинк. Публикуется только dist/.
#   deploy.sh prod        — сборка и выкладка на https://mtg-adm.ru/
#   deploy.sh staging     — сборка и выкладка на /staging/ (Basic Auth); STAGING_DEBUG_TOKEN включает debug API
#   deploy.sh rollback [prod|staging] — вернуть предыдущий релиз
#   deploy.sh list [prod|staging]
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WWW=/var/www/adm
KEEP=3
DOMAIN=https://mtg-adm.ru

target="${2:-prod}"
case "${1:-}" in prod|staging) target="$1" ;; esac
if [[ "$target" == prod ]]; then REL="$WWW/releases"; LINK="$WWW/current"; URL="$DOMAIN/"
else REL="$WWW/staging-releases"; LINK="$WWW/staging"; URL="$DOMAIN/staging/"; fi

die() { echo "deploy: $*" >&2; exit 1; }

switch() {
  ln -sfn "$1" "$LINK.tmp"
  mv -T "$LINK.tmp" "$LINK"
  echo "deploy: $target -> $(basename "$1")"
}

releases() { find "$REL" -mindepth 1 -maxdepth 1 -type d -printf '%f\n' 2>/dev/null | sort; }

verify() {
  local auth=()
  if [[ "$target" == staging ]]; then
    [[ -r /root/adm-staging-password.txt ]] || { echo "deploy: пароль staging не найден, проверка заголовков пропущена"; return; }
    auth=(-u "author:$(cat /root/adm-staging-password.txt)")
  fi
  local h; h="$(curl -sSI "${auth[@]}" "$URL")" || die "сайт не отвечает: $URL"
  for need in 'HTTP/[0-9.]+ 200' 'content-security-policy:' 'x-robots-tag: noindex' 'referrer-policy: no-referrer'; do
    grep -qiE "$need" <<<"$h" || die "в ответе $URL нет «$need»"
  done
  grep -qi '^server: nginx/' <<<"$h" && die "nginx светит версию"
  local js; js="$(curl -sS "${auth[@]}" "$URL" | grep -oE 'assets/index-[A-Za-z0-9_-]+\.js' | head -1)"
  [[ -n "$js" ]] || die "в index.html не найден бандл"
  local code; code="$(curl -s -o /dev/null -w '%{http_code}' "${auth[@]}" "$URL$js.map")"
  [[ "$code" == 404 || "$code" == 403 ]] || die "sourcemap доступен ($code)"
  curl -sS "${auth[@]}" "${URL}robots.txt" | grep -q 'Disallow: /' || die "robots.txt не запрещает индексацию"
  echo "deploy: проверка $URL пройдена"
}

case "${1:-}" in
  prod|staging)
    cd "$ROOT"
    export NVM_DIR="$HOME/.nvm"
    # shellcheck disable=SC1091
    [[ -s "$NVM_DIR/nvm.sh" ]] && . "$NVM_DIR/nvm.sh" >/dev/null && nvm use 22 >/dev/null
    unset VITE_DEBUG_TOKEN
    [[ "$target" == staging && -n "${STAGING_DEBUG_TOKEN:-}" ]] && export VITE_DEBUG_TOKEN="$STAGING_DEBUG_TOKEN"
    npm run build
    [[ -f dist/index.html ]] || die "нет dist/index.html"
    if [[ "$target" == prod ]] && grep -rqsE '__adm([^_]|$)' dist/assets; then die "debug API попал в прод-сборку"; fi
    ts="$(date +%Y%m%d%H%M%S)"
    mkdir -p "$REL/$ts"
    cp -a dist/. "$REL/$ts/"
    find "$REL/$ts" -type d -exec chmod 755 {} + && find "$REL/$ts" -type f -exec chmod 644 {} +
    switch "$REL/$ts"
    mapfile -t all < <(releases)
    if (( ${#all[@]} > KEEP )); then
      for old in "${all[@]:0:${#all[@]}-KEEP}"; do rm -rf "${REL:?}/$old"; echo "deploy: удалён $old"; done
    fi
    verify
    ;;
  rollback)
    cur="$(basename "$(readlink -f "$LINK")")"
    prev="$(releases | grep -B1 -x "$cur" | head -1)"
    [[ -n "$prev" && "$prev" != "$cur" ]] || die "нет предыдущего релиза для $target"
    switch "$REL/$prev"
    ;;
  list)
    cur="$(basename "$(readlink -f "$LINK" 2>/dev/null || echo -)")"
    releases | while read -r r; do [[ "$r" == "$cur" ]] && echo "* $r" || echo "  $r"; done
    ;;
  *) sed -n '2,6p' "$0"; exit 1 ;;
esac

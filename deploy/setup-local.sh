#!/usr/bin/env bash
# Установка /crm_fr на vhost public.lan (рядом с /crm)
# Запуск: sudo bash deploy/setup-local.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
INC_SRC="$ROOT/deploy/apache/public.lan-crm_fr.inc.conf"
INC_DST="/etc/apache2/conf-available/crm-frontend-franchising-crm_fr.inc.conf"
SITE_CONF="/etc/apache2/sites-available/site.lan.conf"
MARKER="# crm-frontend-franchising /crm_fr"

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Нужен root: sudo bash deploy/setup-local.sh" >&2
  exit 1
fi

if [[ ! -f "$SITE_CONF" ]]; then
  echo "Не найден $SITE_CONF — ожидается vhost public.lan" >&2
  exit 1
fi

a2enmod proxy proxy_http headers rewrite alias
cp "$INC_SRC" "$INC_DST"

if ! grep -qF "$INC_DST" "$SITE_CONF"; then
  python3 - "$SITE_CONF" "$INC_DST" "$MARKER" <<'PY'
import sys
from pathlib import Path

site, inc, marker = Path(sys.argv[1]), sys.argv[2], sys.argv[3]
text = site.read_text()
needle = "</VirtualHost>"
if needle not in text:
    raise SystemExit(f"В {site} нет </VirtualHost>")
block = f"\n    {marker}\n    Include {inc}\n"
site.write_text(text.replace(needle, block + needle, 1))
print(f"Добавлен Include в {site}")
PY
else
  echo "Include уже есть в $SITE_CONF"
fi

# Старый отдельный хост больше не нужен
if [[ -L /etc/apache2/sites-enabled/franchising.public.lan.conf ]] || \
   [[ -f /etc/apache2/sites-enabled/franchising.public.lan.conf ]]; then
  a2dissite franchising.public.lan.conf || true
  echo "Отключён franchising.public.lan (используйте http://public.lan/crm_fr/)"
fi

if grep -qE '[[:space:]]franchising\.public\.lan([[:space:]]|$)' /etc/hosts; then
  echo "Подсказка: franchising.public.lan в /etc/hosts можно удалить — приложение на http://public.lan/crm_fr/"
fi

apache2ctl configtest
systemctl reload apache2
echo "Готово: http://public.lan/crm_fr/"
echo "API gateway: http://public.lan/crm_fr/api/ → crm.public.lan"
echo "После изменений фронта: cd $ROOT && npm run build"

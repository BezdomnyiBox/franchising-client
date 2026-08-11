# franchising-client

Клиент для **менеджера франшизы (ПВ)**: оформление и ведение заказов в рамках своего пункта выдачи.

Логика совпадает с CRM franchising, UI — отдельный современный SPA без Material UI.

## Стек

- Vite + React 19 + TypeScript
- Tailwind CSS v4 + shadcn/ui
- TanStack Query
- React Router 7
- React Hook Form + Zod
- Axios (cookie-сессия)

## Экраны MVP

Публичный base path: **`/crm_fr`** (prod и LAN одинаково).

| Путь | Назначение |
|------|------------|
| `/crm_fr/orders` | Список заказов ПВ |
| `/crm_fr/orders/new` | Создание заказа |
| `/crm_fr/orders/:publicNumber` | Карточка заказа |
| `/crm_fr/search` | Поиск товаров (опционально `?orderNumber=`) |
| `/crm_fr/login` | Вход |

Публичный номер заказа в URL: `internalId - 40777` (как в CRM).

## Production / LAN (вариант A — same-origin)

```
https://podzamenu.ru/crm_fr/*          → статика SPA
https://podzamenu.ru/crm_fr/api/*      → proxy → https://back.podzamenu.ru/*
https://podzamenu.ru/crm               → основная CRM

LAN (тот же хост, что и сайт/CRM):
http://public.lan/crm_fr/*             → статика SPA
http://public.lan/crm_fr/api/*         → proxy → http://crm.public.lan/*
http://public.lan/crm                  → основная CRM
```

Cookie `franchising_auth` остаётся на том же origin (`public.lan` / `podzamenu.ru`) — без CORS.


## Быстрый старт

```bash
nvm use   # Node 22
cp .env.example .env
npm install
npm run dev
```

Открывать: `http://public.lan:5173/crm_fr/` (Vite) или после build — `http://public.lan/crm_fr/`.

Dev-прокси: `/crm_fr/api/*` → `VITE_API_PROXY_TARGET` (см. `vite.config.ts`).  
Cookie с бэкенда переписываются под localhost (`Domain`/`Secure` снимаются).

Сборка под Apache LAN / prod:

```bash
npm run build
sudo bash deploy/setup-local.sh   # Include /crm_fr в vhost public.lan
# URL: http://public.lan/crm_fr/
```

### Auth

Отдельная авторизация франшизы (не трогает `/login_user` и cookie `user` сайта/CRM):

1. Открыть `/crm_fr/login`, войти телефоном и паролем.
2. `POST /crm_fr/api/franchising/auth/login` → proxy → `POST /franchising/auth/login` на бэкенде → `Set-Cookie: franchising_auth=…` (HttpOnly).
3. Доступ только роли `franchising` или manager с `branchId`.
4. `GET /crm_fr/api/franchising/auth/me` (или `GET /user/crm_info` через request-bridge).
5. Выход — `POST /crm_fr/api/franchising/auth/logout`.
6. 401 с API → редирект на `/crm_fr/login`.

Опционально: `VITE_EXTERNAL_LOGIN_URL` — ссылка на вход на главной сайта.

Env:

| Переменная | Пример |
|------------|--------|
| `VITE_APP_BASE_PATH` | `/crm_fr` |
| `VITE_API_BASE_URL` | `/crm_fr/api` |
| `VITE_API_PROXY_TARGET` | `http://crm.public.lan` / `https://back.podzamenu.ru` |
| `VITE_LOGIN_PATH` | `/franchising/auth/login` |

## OpenAPI

Черновик контракта с бэкендом: [`openapi/franchising-client.openapi.yaml`](./openapi/franchising-client.openapi.yaml).

Ключевые требования к API:

1. Scope только свой `manager.branchId` и свои заказы.
2. `branchId` / `userId` при создании заказа — только из сессии.
3. Доступ к чужому `orderId` → `403`.

## Структура

```
src/
  app/           # providers, router (basename=/crm_fr), layout
  pages/         # экраны
  features/      # auth, orders, search (api + domain helpers)
  entities/      # типы order / product / user
  shared/        # http, config (APP_BASE_PATH, API_BASE_URL)
  components/ui  # shadcn
openapi/         # контракт с бэкендом
deploy/          # Apache/Nginx: LAN + snippet prod
```

## Связь с CRM

Reference-реализация staff UI: `podzamenu-crm-frontend`  
(`franchising_orders_list`, `franchising_order`, `new_franchising_order`, `search`).

Этот репозиторий **не** форк CRM — только домен и пути API.

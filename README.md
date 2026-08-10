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

| Путь | Назначение |
|------|------------|
| `/orders` | Список заказов ПВ |
| `/orders/new` | Создание заказа |
| `/orders/:publicNumber` | Карточка заказа |
| `/search` | Поиск товаров (опционально `?orderNumber=`) |

Публичный номер заказа в URL: `internalId - 40777` (как в CRM).

## Быстрый старт

```bash
nvm use   # Node 22
cp .env.example .env
npm install
npm run dev
```

Dev-прокси: запросы на `/api/*` уходят на `VITE_API_PROXY_TARGET` (см. `vite.config.ts`).
Cookie с CRM переписываются на localhost (`Domain` снимается, `Secure` снимается) — живая cookie-сессия в `npm run dev`.

### Auth

Отдельная авторизация франшизы (не трогает `/login_user` и cookie `user` сайта/CRM):

1. Открыть `/login`, войти телефоном и паролем.
2. `POST /franchising/auth/login` → `Set-Cookie: franchising_auth=v1.{apiUserId}.{exp}.{hmac}` (HttpOnly).
3. Доступ только роли `franchising` или manager с `branchId`.
4. `GET /franchising/auth/me` (или `GET /user/crm_info` через request-bridge).
5. Выход — `POST /franchising/auth/logout`.
6. 401 с API → редирект на `/login`.

Опционально: `VITE_EXTERNAL_LOGIN_URL` — ссылка на вход на главной сайта.

## OpenAPI

Черновик контракта с бэкендом: [`openapi/franchising-client.openapi.yaml`](./openapi/franchising-client.openapi.yaml).

Ключевые требования к API:

1. Scope только свой `manager.branchId` и свои заказы.
2. `branchId` / `userId` при создании заказа — только из сессии.
3. Доступ к чужому `orderId` → `403`.

## Структура

```
src/
  app/           # providers, router, layout
  pages/         # экраны
  features/      # auth, orders, search (api + domain helpers)
  entities/      # типы order / product / user
  shared/        # http, config
  components/ui  # shadcn
openapi/         # контракт с бэкендом
```

## Связь с CRM

Reference-реализация staff UI: `podzamenu-crm-frontend`  
(`franchising_orders_list`, `franchising_order`, `new_franchising_order`, `search`).

Этот репозиторий **не** форк CRM — только домен и пути API.

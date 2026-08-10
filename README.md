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

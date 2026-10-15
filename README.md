# SaleScout — мини-версия прайс-бота

Решение тестового задания: расчёт цены, HTTP API и веб-страница «было / стало».

**Стек:** Node.js 20+, TypeScript, Express, React + Vite, vitest.

## Быстрый старт

```bash
npm install
npm test            # 32 теста: calculatePrice + API
npm run typecheck   # tsc --noEmit
```

### Запуск для разработки (два терминала)

```bash
npm run dev:server   # API на http://localhost:3001  (POST /reprice)
npm run dev:web      # страница на http://localhost:5173
```

Vite проксирует запросы `/reprice` на порт 3001, поэтому страница работает без доп. настроек.
Откройте http://localhost:5173 — таблица построится автоматически на примере из `data/products.json`.

### Запуск одним процессом (production)

```bash
npm run build        # соберёт фронтенд в dist/web
npm start            # API + статика на http://localhost:3001
```

Порт меняется переменной `PORT`.

## API

`POST /reprice`, `Content-Type: application/json`, тело — `Product[]`.

```bash
curl -X POST http://localhost:3001/reprice \
  -H "Content-Type: application/json" \
  -d @data/products.json
```

| Ситуация | Ответ |
|---|---|
| Корректный массив товаров | `200`, `PriceResult[]` в том же порядке |
| Тело — не массив / невалидный JSON | `400`, `{ "error": "..." }` |
| Товар с неверными полями (нет `sku`, отрицательная цена, `minPrice > maxPrice` …) | `400`, `{ "error": "...", "details": [...] }` |

## Структура

```
src/pricing.ts      calculatePrice — чистая функция (без I/O)
src/types.ts        типы Product / PriceResult
server/app.ts       Express-приложение, POST /reprice
server/validate.ts  валидация тела запроса
server/index.ts     запуск сервера
web/                React-страница (Vite)
tests/              тесты calculatePrice и API
data/               пример входных и ожидаемых данных
```

## Решения и нюансы

- **Погрешность float.** `128.2 - 0.2` в JS равно `127.99999999999999`, и «голый» `Math.floor` дал бы 127
  вместо 128. Перед округлением разность округляется до 6 знаков (`PRECISION`), потом берётся `floor`.
  Покрыто тестами.
- **`-0`.** `Math.floor(-0)` возвращает `-0`, а `toEqual` в тестах различает `0` и `-0`, поэтому к результату
  добавлен `+ 0`.
- **Границы включительно.** `candidate === minPrice` и `candidate === maxPrice` — это `UNDERCUT`,
  `AT_MIN` / `AT_MAX` только при выходе за границу.
- **`myPrice`** на расчёт не влияет, только возвращается как `oldPrice`.
- **Валидация** вынесена в эндпоинт; `calculatePrice` данные не проверяет (по условию задания).
- Конфиг vitest вынесен в `vitest.config.ts`, потому что `vite.config.ts` использует `root: "web"`.

---

<details>
<summary>Исходный текст задания</summary>

Лежит в `TASK.md`.

</details>

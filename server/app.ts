import express, { type ErrorRequestHandler } from "express";
import { existsSync } from "node:fs";
import path from "node:path";
import { calculatePrice } from "../src/pricing";
import { validateProducts } from "./validate";
import type { Product } from "../src/types";

export function createApp() {
  const app = express();
  app.use(express.json({ limit: "5mb" }));

  app.post("/reprice", (req, res) => {
    const errors = validateProducts(req.body);
    if (errors.length > 0) {
      res.status(400).json({ error: "Некорректное тело запроса", details: errors });
      return;
    }
    const products = req.body as Product[];
    res.json(products.map(calculatePrice));
  });

  // В «боевом» режиме (npm run build && npm start) отдаём собранный фронтенд.
  const webDist = path.resolve("dist/web");
  if (existsSync(webDist)) app.use(express.static(webDist));

  // Невалидный JSON в теле -> 400 в JSON, а не HTML-страница с ошибкой.
  const onError: ErrorRequestHandler = (err: { status?: number; type?: string }, _req, res, _next) => {
    if (err.type === "entity.parse.failed") {
      res.status(400).json({ error: "Невалидный JSON" });
      return;
    }
    res.status(err.status ?? 500).json({ error: "Внутренняя ошибка сервера" });
  };
  app.use(onError);

  return app;
}

import type { Product } from "../src/types";

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

const isMoney = (v: unknown): v is number =>
  typeof v === "number" && Number.isFinite(v) && v >= 0;

/**
 * Проверяет, что тело запроса — массив корректных товаров.
 * Возвращает список ошибок (пустой — всё хорошо).
 */
export function validateProducts(body: unknown): string[] {
  if (!Array.isArray(body)) return ["Тело запроса должно быть массивом товаров"];

  const errors: string[] = [];
  body.forEach((item: unknown, i: number) => {
    const at = `[${i}]`;
    if (!isRecord(item)) {
      errors.push(`${at}: товар должен быть объектом`);
      return;
    }
    if (typeof item.sku !== "string") errors.push(`${at}.sku: ожидается строка`);
    if (typeof item.name !== "string") errors.push(`${at}.name: ожидается строка`);
    for (const key of ["myPrice", "minPrice", "maxPrice", "step"] as const) {
      if (!isMoney(item[key])) errors.push(`${at}.${key}: ожидается конечное число >= 0`);
    }
    if (isMoney(item.minPrice) && isMoney(item.maxPrice) && item.minPrice > item.maxPrice) {
      errors.push(`${at}: minPrice не может быть больше maxPrice`);
    }
    if (!Array.isArray(item.competitors)) {
      errors.push(`${at}.competitors: ожидается массив`);
    } else {
      item.competitors.forEach((c: unknown, j: number) => {
        if (!isRecord(c) || !isMoney(c.price) || typeof c.inStock !== "boolean") {
          errors.push(`${at}.competitors[${j}]: нужны price (число >= 0) и inStock (boolean)`);
        }
      });
    }
  });
  return errors;
}

/** Type guard: после успешной validateProducts тело можно считать Product[]. */
export function isProductArray(body: unknown): body is Product[] {
  return validateProducts(body).length === 0;
}

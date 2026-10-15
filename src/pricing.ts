import type { Product, PriceResult } from "./types";

/**
 * Дробные цены/шаги в двоичной арифметике дают погрешность:
 * 128.2 - 0.2 === 127.99999999999999, и Math.floor вернул бы 127 вместо 128.
 * Поэтому перед округлением вниз срезаем «шум» после 6-го знака.
 */
const PRECISION = 1e6;

/**
 * Чистая функция: рассчитывает новую цену для одного товара.
 * Правила — см. README, раздел «Правила расчёта цены».
 */
export function calculatePrice(product: Product): PriceResult {
  const { sku, myPrice, minPrice, maxPrice, step, competitors } = product;
  const base = { sku, oldPrice: myPrice };

  // 1. Учитываем только конкурентов в наличии; ищем минимальную цену.
  let best = Infinity;
  for (const c of competitors) {
    if (c.inStock && c.price < best) best = c.price;
  }

  // 2. Никого нет — ставим максимум.
  if (best === Infinity) {
    return { ...base, newPrice: maxPrice, reason: "NO_COMPETITORS" };
  }

  // 4. Кандидат: на step дешевле лучшего конкурента, округляем вниз.
  //    "+ 0" превращает -0 в 0 (Math.floor(-0) === -0).
  const candidate = Math.floor(Math.round((best - step) * PRECISION) / PRECISION) + 0;

  // 5. Ограничиваем диапазоном [minPrice, maxPrice] (границы включительно).
  if (candidate < minPrice) return { ...base, newPrice: minPrice, reason: "AT_MIN" };
  if (candidate > maxPrice) return { ...base, newPrice: maxPrice, reason: "AT_MAX" };
  return { ...base, newPrice: candidate, reason: "UNDERCUT" };
}

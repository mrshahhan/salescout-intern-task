import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { calculatePrice } from "../src/pricing";
import type { Product, PriceResult } from "../src/types";

/** Фабрика товара: переопределяем только то, что важно для теста. */
function product(over: Partial<Product> = {}): Product {
  return {
    sku: "TEST",
    name: "Test",
    myPrice: 1000,
    minPrice: 500,
    maxPrice: 2000,
    step: 10,
    competitors: [{ seller: "A", price: 1500, inStock: true }],
    ...over,
  };
}

const inStock = (price: number) => ({ seller: "S", price, inStock: true });
const outOfStock = (price: number) => ({ seller: "S", price, inStock: false });

describe("примеры из README", () => {
  it("UNDERCUT: 384990 - 10 = 384980", () => {
    const r = calculatePrice(
      product({ minPrice: 370000, maxPrice: 420000, step: 10, competitors: [inStock(384990)] }),
    );
    expect(r.newPrice).toBe(384980);
    expect(r.reason).toBe("UNDERCUT");
  });

  it("AT_MIN: кандидат ниже минимума", () => {
    const r = calculatePrice(
      product({ minPrice: 180000, maxPrice: 210000, step: 100, competitors: [inStock(175000)] }),
    );
    expect(r).toMatchObject({ newPrice: 180000, reason: "AT_MIN" });
  });

  it("AT_MAX: кандидат выше максимума", () => {
    const r = calculatePrice(
      product({ minPrice: 100000, maxPrice: 125000, step: 1, competitors: [inStock(150000)] }),
    );
    expect(r).toMatchObject({ newPrice: 125000, reason: "AT_MAX" });
  });

  it("дробные значения: 349999.9 - 0.5 -> 349999", () => {
    const r = calculatePrice(
      product({ minPrice: 330000, maxPrice: 380000, step: 0.5, competitors: [inStock(349999.9)] }),
    );
    expect(r).toMatchObject({ newPrice: 349999, reason: "UNDERCUT" });
  });

  it("NO_COMPETITORS: единственный конкурент не в наличии", () => {
    const r = calculatePrice(
      product({ minPrice: 80000, maxPrice: 99990, step: 50, competitors: [outOfStock(85000)] }),
    );
    expect(r).toMatchObject({ newPrice: 99990, reason: "NO_COMPETITORS" });
  });
});

describe("data/products.json -> data/expected.json", () => {
  it("совпадает с ожидаемым результатом", () => {
    const products = JSON.parse(readFileSync("data/products.json", "utf8")) as Product[];
    const expected = JSON.parse(readFileSync("data/expected.json", "utf8")) as PriceResult[];
    expect(products.map(calculatePrice)).toEqual(expected);
  });
});

describe("конкуренты", () => {
  it("пустой список -> maxPrice", () => {
    const r = calculatePrice(product({ competitors: [] }));
    expect(r).toMatchObject({ newPrice: 2000, reason: "NO_COMPETITORS" });
  });

  it("все не в наличии -> NO_COMPETITORS", () => {
    const r = calculatePrice(product({ competitors: [outOfStock(100), outOfStock(200)] }));
    expect(r.reason).toBe("NO_COMPETITORS");
  });

  it("товары не в наличии полностью игнорируются, даже если дешевле", () => {
    const r = calculatePrice(
      product({ competitors: [outOfStock(600), inStock(1500), inStock(1200)] }),
    );
    expect(r).toMatchObject({ newPrice: 1190, reason: "UNDERCUT" });
  });

  it("берётся минимальная цена среди нескольких", () => {
    const r = calculatePrice(product({ competitors: [inStock(1800), inStock(1300), inStock(1600)] }));
    expect(r.newPrice).toBe(1290);
  });

  it("одинаковая минимальная цена у нескольких — это просто best", () => {
    const r = calculatePrice(product({ competitors: [inStock(1300), inStock(1300), inStock(1400)] }));
    expect(r.newPrice).toBe(1290);
  });
});

describe("границы диапазона (включительно)", () => {
  it("candidate === minPrice -> UNDERCUT, не AT_MIN", () => {
    const r = calculatePrice(product({ minPrice: 1290, competitors: [inStock(1300)] }));
    expect(r).toMatchObject({ newPrice: 1290, reason: "UNDERCUT" });
  });

  it("candidate === minPrice - 1 -> AT_MIN", () => {
    const r = calculatePrice(product({ minPrice: 1291, competitors: [inStock(1300)] }));
    expect(r).toMatchObject({ newPrice: 1291, reason: "AT_MIN" });
  });

  it("candidate === maxPrice -> UNDERCUT, не AT_MAX", () => {
    const r = calculatePrice(product({ maxPrice: 1290, competitors: [inStock(1300)] }));
    expect(r).toMatchObject({ newPrice: 1290, reason: "UNDERCUT" });
  });

  it("candidate === maxPrice + 1 -> AT_MAX", () => {
    const r = calculatePrice(product({ maxPrice: 1289, competitors: [inStock(1300)] }));
    expect(r).toMatchObject({ newPrice: 1289, reason: "AT_MAX" });
  });

  it("minPrice === maxPrice: цена фиксирована", () => {
    const r = calculatePrice(product({ minPrice: 1000, maxPrice: 1000, competitors: [inStock(5000)] }));
    expect(r).toMatchObject({ newPrice: 1000, reason: "AT_MAX" });
    const r2 = calculatePrice(product({ minPrice: 1000, maxPrice: 1000, competitors: [inStock(100)] }));
    expect(r2).toMatchObject({ newPrice: 1000, reason: "AT_MIN" });
  });
});

describe("шаг и округление", () => {
  it("step = 0: становимся вровень с конкурентом", () => {
    const r = calculatePrice(product({ step: 0, competitors: [inStock(1300)] }));
    expect(r).toMatchObject({ newPrice: 1300, reason: "UNDERCUT" });
  });

  it("дробная цена конкурента при step = 0 округляется вниз", () => {
    const r = calculatePrice(product({ step: 0, competitors: [inStock(1300.9)] }));
    expect(r.newPrice).toBe(1300);
  });

  it("дробный шаг: 1300 - 0.5 = 1299.5 -> 1299", () => {
    const r = calculatePrice(product({ step: 0.5, competitors: [inStock(1300)] }));
    expect(r.newPrice).toBe(1299);
  });

  it("погрешность float: 128.2 - 0.2 даёт 128, а не 127", () => {
    const r = calculatePrice(
      product({ minPrice: 0, maxPrice: 1000, step: 0.2, competitors: [inStock(128.2)] }),
    );
    expect(r.newPrice).toBe(128);
  });

  it("погрешность float: 128.7 - 0.7 даёт 128, а не 127", () => {
    const r = calculatePrice(
      product({ minPrice: 0, maxPrice: 1000, step: 0.7, competitors: [inStock(128.7)] }),
    );
    expect(r.newPrice).toBe(128);
  });

  it("кандидат ниже нуля -> AT_MIN", () => {
    const r = calculatePrice(
      product({ minPrice: 0, maxPrice: 1000, step: 50, competitors: [inStock(10)] }),
    );
    expect(r).toMatchObject({ newPrice: 0, reason: "AT_MIN" });
  });

  it("результат — целое число и не -0", () => {
    const r = calculatePrice(
      product({ minPrice: 0, maxPrice: 1000, step: 0.0000001, competitors: [inStock(0.0000001)] }),
    );
    expect(Number.isInteger(r.newPrice)).toBe(true);
    expect(Object.is(r.newPrice, -0)).toBe(false);
    expect(r.newPrice).toBe(0);
  });
});

describe("прочее", () => {
  it("myPrice не влияет на расчёт, но возвращается как oldPrice", () => {
    const a = calculatePrice(product({ myPrice: 1 }));
    const b = calculatePrice(product({ myPrice: 999999 }));
    expect(a.newPrice).toBe(b.newPrice);
    expect(a.oldPrice).toBe(1);
    expect(b.oldPrice).toBe(999999);
  });

  it("возвращает sku как есть", () => {
    expect(calculatePrice(product({ sku: "ABC-1" })).sku).toBe("ABC-1");
  });

  it("не мутирует входные данные", () => {
    const p = product({ competitors: [inStock(1300), outOfStock(10)] });
    const snapshot = structuredClone(p);
    calculatePrice(p);
    expect(p).toEqual(snapshot);
  });
});

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { createApp } from "../server/app";
import type { Product, PriceResult } from "../src/types";

let server: Server;
let base: string;

beforeAll(async () => {
  server = createApp().listen(0);
  await new Promise<void>((resolve) => server.once("listening", resolve));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())));

const post = (body: string) =>
  fetch(`${base}/reprice`, { method: "POST", headers: { "Content-Type": "application/json" }, body });

describe("POST /reprice", () => {
  it("200 и ожидаемый результат для data/products.json", async () => {
    const products = readFileSync("data/products.json", "utf8");
    const expected = JSON.parse(readFileSync("data/expected.json", "utf8")) as PriceResult[];
    const res = await post(products);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(expected);
  });

  it("пустой массив -> 200 и []", async () => {
    const res = await post("[]");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);
  });

  it("порядок результатов совпадает с порядком товаров", async () => {
    const products = JSON.parse(readFileSync("data/products.json", "utf8")) as Product[];
    const res = await post(JSON.stringify([...products].reverse()));
    const data = (await res.json()) as PriceResult[];
    expect(data.map((r) => r.sku)).toEqual(products.map((p) => p.sku).reverse());
  });

  it("400, если тело — не массив", async () => {
    expect((await post(JSON.stringify({ sku: "x" }))).status).toBe(400);
    expect((await post("123")).status).toBe(400);
    expect((await post('"строка"')).status).toBe(400);
    expect((await post("null")).status).toBe(400);
  });

  it("400 на невалидный JSON", async () => {
    const res = await post("{не json");
    expect(res.status).toBe(400);
    expect(await res.json()).toHaveProperty("error");
  });

  it("400, если в массиве некорректный товар", async () => {
    const res = await post(JSON.stringify([{ sku: "x", name: "y", myPrice: "много" }]));
    expect(res.status).toBe(400);
    const body = (await res.json()) as { details: string[] };
    expect(body.details.length).toBeGreaterThan(0);
  });
});

import { useCallback, useEffect, useState } from "react";
import sample from "../data/products.json";
import type { PriceResult, Product, Reason } from "../src/types";
import { reprice } from "./api";

const SAMPLE_JSON = JSON.stringify(sample, null, 2);

const REASON_LABEL: Record<Reason, string> = {
  UNDERCUT: "Ниже конкурента",
  AT_MIN: "Минимальная цена",
  AT_MAX: "Максимальная цена",
  NO_COMPETITORS: "Нет конкурентов",
};

const formatPrice = (n: number) => `${n.toLocaleString("ru-RU")} ₸`;

function Delta({ oldPrice, newPrice }: { oldPrice: number; newPrice: number }) {
  const diff = newPrice - oldPrice;
  if (diff === 0) return <span className="delta">без изменений</span>;
  const cls = diff > 0 ? "delta up" : "delta down";
  return (
    <span className={cls}>
      {diff > 0 ? "+" : "−"}
      {Math.abs(diff).toLocaleString("ru-RU")}
    </span>
  );
}

export function App() {
  const [json, setJson] = useState(SAMPLE_JSON);
  const [products, setProducts] = useState<Product[]>([]);
  const [results, setResults] = useState<PriceResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async (text: string) => {
    setLoading(true);
    setError(null);
    try {
      const parsed: unknown = JSON.parse(text);
      if (!Array.isArray(parsed)) throw new Error("Ожидается JSON-массив товаров");
      const data = parsed as Product[];
      const res = await reprice(data);
      setProducts(data);
      setResults(res);
    } catch (e) {
      setError(e instanceof SyntaxError ? "Невалидный JSON" : e instanceof Error ? e.message : "Неизвестная ошибка");
    } finally {
      setLoading(false);
    }
  }, []);

  // При открытии страницы сразу считаем цены для примера.
  useEffect(() => {
    void run(SAMPLE_JSON);
  }, [run]);

  return (
    <main className="page">
      <h1>SaleScout · прайс-бот</h1>
      <p className="hint">
        Таблица «было / стало» строится запросом <code>POST /reprice</code>. Можно изменить исходные данные ниже и
        пересчитать.
      </p>

      {error && <div className="error">{error}</div>}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>SKU</th>
              <th>Название</th>
              <th className="num">Старая цена</th>
              <th className="num">Новая цена</th>
              <th>Изменение</th>
              <th>Причина</th>
            </tr>
          </thead>
          <tbody>
            {results.map((r, i) => (
              <tr key={`${r.sku}-${i}`}>
                <td className="mono">{r.sku}</td>
                <td>{products[i]?.name}</td>
                <td className="num">{formatPrice(r.oldPrice)}</td>
                <td className="num strong">{formatPrice(r.newPrice)}</td>
                <td>
                  <Delta oldPrice={r.oldPrice} newPrice={r.newPrice} />
                </td>
                <td>
                  <span className={`badge ${r.reason}`} title={r.reason}>
                    {REASON_LABEL[r.reason]}
                  </span>
                </td>
              </tr>
            ))}
            {!loading && results.length === 0 && (
              <tr>
                <td colSpan={6} className="empty">
                  Нет данных
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <h2>Исходные данные (JSON)</h2>
      <textarea value={json} onChange={(e) => setJson(e.target.value)} spellCheck={false} rows={14} />
      <div className="actions">
        <button onClick={() => void run(json)} disabled={loading}>
          {loading ? "Считаем…" : "Пересчитать"}
        </button>
        <button
          className="secondary"
          onClick={() => {
            setJson(SAMPLE_JSON);
            void run(SAMPLE_JSON);
          }}
          disabled={loading}
        >
          Сбросить пример
        </button>
      </div>
    </main>
  );
}

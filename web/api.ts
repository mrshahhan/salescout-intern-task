import type { PriceResult, Product } from "../src/types";

/** Отправляет товары на POST /reprice. При ошибке бросает Error с понятным текстом. */
export async function reprice(products: Product[]): Promise<PriceResult[]> {
  const res = await fetch("/reprice", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(products),
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string; details?: string[] } | null;
    const details = body?.details?.slice(0, 3).join("; ");
    throw new Error([body?.error ?? `Ошибка сервера (${res.status})`, details].filter(Boolean).join(": "));
  }
  return (await res.json()) as PriceResult[];
}

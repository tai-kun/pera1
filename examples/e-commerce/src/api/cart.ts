import { findProduct, type Product } from "./products.js";

export type CartLine = {
  readonly product: Product;
  readonly quantity: number;
};

export type CartSummary = {
  readonly lines: CartLine[];
  readonly count: number;
  readonly total: number;
};

const STORAGE_KEY = "pera1-e-commerce:cart";

const quantities = new Map<string, number>();

let initialized = false;

function ensureInitialized(): void {
  if (initialized) {
    return;
  }
  initialized = true;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return;
    }
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (typeof parsed !== "object" || parsed === null) {
      return;
    }
    for (const [productId, quantity] of Object.entries(parsed)) {
      if (typeof quantity === "number" && Number.isInteger(quantity) && quantity > 0) {
        quantities.set(productId, quantity);
      }
    }
  } catch {
    // 読み込みに失敗しても空カートとして扱います。
  }
}

function persist(): void {
  try {
    const record: Record<string, number> = {};
    for (const [productId, quantity] of quantities) {
      record[productId] = quantity;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
  } catch {
    // 保存に失敗しても無視します。
  }
}

export async function addToCart(productId: string, quantity = 1): Promise<void> {
  ensureInitialized();
  const product = await findProduct(productId);
  if (!product) {
    throw new Error(`商品 ${productId} は見つかりませんでした。`);
  }
  const current = quantities.get(productId) ?? 0;
  quantities.set(productId, current + quantity);
  persist();
}

export async function listCart(): Promise<CartSummary> {
  ensureInitialized();
  const lines: CartLine[] = [];
  for (const [productId, quantity] of quantities) {
    const product = await findProduct(productId);
    if (product) {
      lines.push({ product, quantity });
    }
  }
  lines.sort((a, b) => a.product.id.localeCompare(b.product.id));
  const count = lines.reduce((sum, line) => sum + line.quantity, 0);
  const total = lines.reduce((sum, line) => sum + line.product.price * line.quantity, 0);

  return { lines, count, total };
}

export function isCartEmptySync(): boolean {
  ensureInitialized();

  return quantities.size === 0;
}

export async function clearCart(): Promise<void> {
  ensureInitialized();
  quantities.clear();
  persist();
}

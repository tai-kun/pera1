import { clearCart, listCart } from "./cart.js";
import { clearCheckoutState, getPayment, getShipping } from "./checkout.js";

export type OrderItem = {
  readonly productId: string;
  readonly name: string;
  readonly price: number;
  readonly quantity: number;
};

export type Order = {
  readonly id: string;
  readonly items: OrderItem[];
  readonly total: number;
  readonly shipping: { readonly name: string; readonly address: string; readonly city: string; readonly zip: string };
  readonly payment: { readonly cardNumber: string; readonly expiry: string };
  readonly createdAt: string;
};

const STORAGE_KEY = "pera1-e-commerce:orders";

const orders = new Map<string, Order>();

let nextId = 1;
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
    const parsed = JSON.parse(raw) as Array<Partial<Order>>;
    if (!Array.isArray(parsed)) {
      return;
    }
    for (const entry of parsed) {
      if (typeof entry.id === "string" && Array.isArray(entry.items)) {
        orders.set(entry.id, entry as Order);
        const numeric = Number(entry.id.replace("order-", ""));
        if (Number.isInteger(numeric) && numeric >= nextId) {
          nextId = numeric + 1;
        }
      }
    }
  } catch {
    // 読み込みに失敗しても空として扱います。
  }
}

function persist(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...orders.values()]));
  } catch {
    // 保存に失敗しても無視します。
  }
}

export async function createOrder(): Promise<Order> {
  ensureInitialized();
  const cart = await listCart();
  if (cart.lines.length === 0) {
    throw new Error("カートが空です。");
  }
  const shipping = getShipping();
  if (!shipping) {
    throw new Error("配送先が入力されていません。");
  }
  const payment = getPayment();
  if (!payment) {
    throw new Error("支払情報が入力されていません。");
  }
  const id = `order-${nextId++}`;
  const order: Order = {
    id,
    items: cart.lines.map((line) => ({
      productId: line.product.id,
      name: line.product.name,
      price: line.product.price,
      quantity: line.quantity,
    })),
    total: cart.total,
    shipping,
    payment: { cardNumber: payment.cardNumber, expiry: payment.expiry },
    createdAt: new Date().toISOString(),
  };
  orders.set(id, order);
  persist();
  await clearCart();
  clearCheckoutState();

  return order;
}

export async function findOrder(id: string): Promise<Order | undefined> {
  ensureInitialized();

  return orders.get(id);
}

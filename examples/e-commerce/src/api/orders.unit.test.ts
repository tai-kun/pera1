import { beforeEach, describe, test, vi } from "vitest";

/**
 * 振る舞いを切り替えられる localStorage のスタブを作成します。
 */
function stubStorage(overrides: Partial<Record<"get" | "set" | "remove", () => never>> = {}) {
  const store = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => {
      if (overrides.get) {
        overrides.get();
      }

      return store.has(key) ? (store.get(key) as string) : null;
    },
    setItem: (key: string, value: string) => {
      if (overrides.set) {
        overrides.set();
      }

      store.set(key, value);
    },
    removeItem: (key: string) => {
      if (overrides.remove) {
        overrides.remove();
      }

      store.delete(key);
    },
  });

  return store;
}

/**
 * モジュール状態を初期化して orders 関連モジュールを取り直します。
 */
async function freshOrders() {
  vi.resetModules();

  const cart = await import("./cart.js");
  const checkout = await import("./checkout.js");
  const orders = await import("./orders.js");

  return { ...cart, ...checkout, ...orders };
}

beforeEach(() => {
  stubStorage();
});

describe("createOrder", () => {
  test("注文を作成してカートを空にする", async ({ expect }) => {
    // 準備
    const api = await freshOrders();
    await api.addToCart("p1", 2);
    api.setShipping({ name: "山田", address: "1-2-3", city: "東京", zip: "100-0001" });
    api.setPayment({ cardNumber: "4111", expiry: "12/30", cvc: "123" });

    // 実行
    const order = await api.createOrder();

    // 検証
    expect(order.id).toBe("order-1");
    expect(order.items).toHaveLength(1);
    expect(order.total).toBeGreaterThan(0);
    expect(order.payment).toStrictEqual({ cardNumber: "4111", expiry: "12/30" });
    expect(await api.findOrder(order.id)).toStrictEqual(order);
    expect(api.isCartEmptySync()).toBe(true);
    expect(api.getShipping()).toBeNull();
  });

  test("空カートでは失敗する", async ({ expect }) => {
    // 準備
    const api = await freshOrders();

    // 実行と検証
    await expect(api.createOrder()).rejects.toThrow("カートが空");
  });

  test("配送先なしでは失敗する", async ({ expect }) => {
    // 準備
    const api = await freshOrders();
    await api.addToCart("p1");

    // 実行と検証
    await expect(api.createOrder()).rejects.toThrow("配送先");
  });

  test("支払情報なしでは失敗する", async ({ expect }) => {
    // 準備
    const api = await freshOrders();
    await api.addToCart("p1");
    api.setShipping({ name: "山田", address: "1-2-3", city: "東京", zip: "100-0001" });

    // 実行と検証
    await expect(api.createOrder()).rejects.toThrow("支払情報");
  });

  test("保存済みの注文番号を引き継ぐ", async ({ expect }) => {
    // 準備
    const store = stubStorage();
    store.set("pera1-e-commerce:orders", JSON.stringify([{ id: "order-5", items: [] }]));
    const api = await freshOrders();
    await api.addToCart("p1");
    api.setShipping({ name: "山田", address: "1-2-3", city: "東京", zip: "100-0001" });
    api.setPayment({ cardNumber: "4111", expiry: "12/30", cvc: "123" });

    // 実行
    const order = await api.createOrder();

    // 検証
    expect(order.id).toBe("order-6");
    expect((await api.findOrder("order-5"))?.id).toBe("order-5");
  });

  test("不正な保存値は無視する", async ({ expect }) => {
    // 準備
    const store = stubStorage();
    store.set(
      "pera1-e-commerce:orders",
      JSON.stringify([{ nope: 1 }, { id: "abc", items: [] }, { id: "order-0", items: [] }]),
    );
    const api = await freshOrders();

    // 実行と検証: 不正な値は飛ばし、小さい番号では採番を進めません。
    expect(await api.findOrder("order-1")).toBeUndefined();
    expect((await api.findOrder("order-0"))?.id).toBe("order-0");
  });

  test("配列以外の保存値は無視する", async ({ expect }) => {
    // 準備
    const store = stubStorage();
    store.set("pera1-e-commerce:orders", JSON.stringify({ id: "order-1" }));
    const api = await freshOrders();

    // 実行と検証
    expect(await api.findOrder("order-1")).toBeUndefined();
  });

  test("壊れた保存値は無視する", async ({ expect }) => {
    // 準備
    const store = stubStorage();
    store.set("pera1-e-commerce:orders", "{壊れた");
    const api = await freshOrders();

    // 実行と検証
    expect(await api.findOrder("order-1")).toBeUndefined();
  });

  test("読み取り失敗は空として扱う", async ({ expect }) => {
    // 準備
    stubStorage({
      get: () => {
        throw new Error("locked");
      },
    });
    const api = await freshOrders();

    // 実行と検証
    expect(await api.findOrder("order-1")).toBeUndefined();
  });

  test("保存失敗でも注文自体は返す", async ({ expect }) => {
    // 準備
    const store = stubStorage();
    const api = await freshOrders();
    await api.addToCart("p1");
    api.setShipping({ name: "山田", address: "1-2-3", city: "東京", zip: "100-0001" });
    api.setPayment({ cardNumber: "4111", expiry: "12/30", cvc: "123" });
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => (store.has(key) ? (store.get(key) as string) : null),
      setItem: () => {
        throw new Error("locked");
      },
      removeItem: () => {},
    });

    // 実行
    const order = await api.createOrder();

    // 検証
    expect(order.id).toBe("order-1");
  });
});

describe("findOrder", () => {
  test("存在しない注文は undefined を返す", async ({ expect }) => {
    // 準備
    const api = await freshOrders();

    // 実行と検証
    expect(await api.findOrder("unknown")).toBeUndefined();
  });
});

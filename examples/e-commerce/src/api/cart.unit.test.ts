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
 * モジュール状態を初期化して cart モジュールを取り直します。
 */
async function freshCart() {
  vi.resetModules();

  return import("./cart.js");
}

beforeEach(() => {
  stubStorage();
});

describe("addToCart", () => {
  test("商品をカートに追加する", async ({ expect }) => {
    // 準備
    const { addToCart, listCart } = await freshCart();

    // 実行
    await addToCart("p1", 2);

    // 検証
    const summary = await listCart();
    expect(summary.count).toBe(2);
    expect(summary.lines).toHaveLength(1);
    expect(summary.total).toBe(summary.lines[0]!.product.price * 2);
  });

  test("存在しない商品は失敗する", async ({ expect }) => {
    // 準備
    const { addToCart } = await freshCart();

    // 実行と検証
    await expect(addToCart("unknown")).rejects.toThrow("見つかりません");
  });

  test("保存済みの数量を復元する", async ({ expect }) => {
    // 準備
    const store = stubStorage();
    store.set("pera1-e-commerce:cart", JSON.stringify({ p1: 3, p2: 1 }));
    const { listCart } = await freshCart();

    // 実行
    const summary = await listCart();

    // 検証
    expect(summary.count).toBe(4);
  });

  test("不正な保存値は無視する", async ({ expect }) => {
    // 準備
    const store = stubStorage();
    store.set(
      "pera1-e-commerce:cart",
      JSON.stringify({ p1: 0, p2: -1, p3: 1.5, p4: "x", p5: 2, missing: 1 }),
    );
    const { listCart, isCartEmptySync } = await freshCart();

    // 実行
    const summary = await listCart();

    // 検証: 存在する商品の正の整数だけが残ります。
    expect(summary.lines.map((line) => line.product.id)).toStrictEqual(["p5"]);
    expect(isCartEmptySync()).toBe(false);
  });

  test("壊れた保存値は空カートとして扱う", async ({ expect }) => {
    // 準備
    const store = stubStorage();
    store.set("pera1-e-commerce:cart", "{壊れた");
    const { listCart, isCartEmptySync } = await freshCart();

    // 実行と検証
    expect((await listCart()).count).toBe(0);
    expect(isCartEmptySync()).toBe(true);
  });

  test("読み取り失敗は空カートとして扱う", async ({ expect }) => {
    // 準備
    stubStorage({
      get: () => {
        throw new Error("locked");
      },
    });
    const { listCart } = await freshCart();

    // 実行と検証
    expect((await listCart()).count).toBe(0);
  });

  test("保存失敗でも追加自体は成功する", async ({ expect }) => {
    // 準備
    stubStorage({
      set: () => {
        throw new Error("locked");
      },
    });
    const { addToCart, listCart } = await freshCart();

    // 実行
    await addToCart("p1");

    // 検証
    expect((await listCart()).count).toBe(1);
  });
});

describe("clearCart", () => {
  test("カートを空にする", async ({ expect }) => {
    // 準備
    const { addToCart, clearCart, isCartEmptySync } = await freshCart();
    await addToCart("p1");

    // 実行
    await clearCart();

    // 検証
    expect(isCartEmptySync()).toBe(true);
  });
});

describe("復元の堅牢性", () => {
  test("オブジェクト以外の保存値は無視する", async ({ expect }) => {
    // 準備
    const store = stubStorage();
    store.set("pera1-e-commerce:cart", JSON.stringify("文字列"));
    const { listCart } = await freshCart();

    // 実行と検証
    expect((await listCart()).count).toBe(0);
  });
});

import { beforeEach, describe, test, vi } from "vitest";

import {
  clearCheckoutState,
  getPayment,
  getShipping,
  setPayment,
  setShipping,
} from "./checkout.js";

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

const SHIPPING = { name: "山田", address: "1-2-3", city: "東京", zip: "100-0001" };
const PAYMENT = { cardNumber: "4111", expiry: "12/30", cvc: "123" };

beforeEach(() => {
  stubStorage();
});

describe("getShipping", () => {
  test("未入力は null を返す", ({ expect }) => {
    // 実行と検証
    expect(getShipping()).toBeNull();
  });

  test("保存済みの配送先を返す", ({ expect }) => {
    // 準備
    setShipping(SHIPPING);

    // 実行と検証
    expect(getShipping()).toStrictEqual(SHIPPING);
  });

  test("壊れた保存値は null を返す", ({ expect }) => {
    // 準備
    const store = stubStorage();
    store.set("pera1-e-commerce:shipping", "{壊れた");

    // 実行と検証
    expect(getShipping()).toBeNull();
  });

  test("読み取り失敗は null を返す", ({ expect }) => {
    // 準備
    stubStorage({
      get: () => {
        throw new Error("locked");
      },
    });

    // 実行と検証
    expect(getShipping()).toBeNull();
  });

  test("項目不足は null を返す", ({ expect }) => {
    // 準備
    const store = stubStorage();
    store.set("pera1-e-commerce:shipping", JSON.stringify({ name: "山田" }));

    // 実行と検証
    expect(getShipping()).toBeNull();
  });

  test("空文字の項目は null を返す", ({ expect }) => {
    // 準備
    const store = stubStorage();
    store.set(
      "pera1-e-commerce:shipping",
      JSON.stringify({ ...SHIPPING, address: "", city: "", zip: "" }),
    );

    // 実行と検証
    expect(getShipping()).toBeNull();
  });

  test("オブジェクト以外は null を返す", ({ expect }) => {
    // 準備
    const store = stubStorage();
    store.set("pera1-e-commerce:shipping", JSON.stringify("文字列"));

    // 実行と検証
    expect(getShipping()).toBeNull();
  });
});

describe("setShipping", () => {
  test("保存失敗でも例外を投げない", ({ expect }) => {
    // 準備
    stubStorage({
      set: () => {
        throw new Error("locked");
      },
    });

    // 実行と検証
    expect(() => setShipping(SHIPPING)).not.toThrow();
  });
});

describe("getPayment", () => {
  test("未入力は null を返す", ({ expect }) => {
    // 実行と検証
    expect(getPayment()).toBeNull();
  });

  test("保存済みの支払情報を返す", ({ expect }) => {
    // 準備
    setPayment(PAYMENT);

    // 実行と検証
    expect(getPayment()).toStrictEqual(PAYMENT);
  });

  test("項目不足は null を返す", ({ expect }) => {
    // 準備
    const store = stubStorage();
    store.set("pera1-e-commerce:payment", JSON.stringify({ cardNumber: "4111" }));

    // 実行と検証
    expect(getPayment()).toBeNull();
  });

  test("空文字の項目は null を返す", ({ expect }) => {
    // 準備
    const store = stubStorage();
    store.set(
      "pera1-e-commerce:payment",
      JSON.stringify({ ...PAYMENT, expiry: "", cvc: "" }),
    );

    // 実行と検証
    expect(getPayment()).toBeNull();
  });

  test("オブジェクト以外は null を返す", ({ expect }) => {
    // 準備
    const store = stubStorage();
    store.set("pera1-e-commerce:payment", "12345");

    // 実行と検証
    expect(getPayment()).toBeNull();
  });
});

describe("setPayment", () => {
  test("保存失敗でも例外を投げない", ({ expect }) => {
    // 準備
    stubStorage({
      set: () => {
        throw new Error("locked");
      },
    });

    // 実行と検証
    expect(() => setPayment(PAYMENT)).not.toThrow();
  });
});

describe("clearCheckoutState", () => {
  test("配送先と支払情報を消す", ({ expect }) => {
    // 準備
    setShipping(SHIPPING);
    setPayment(PAYMENT);

    // 実行
    clearCheckoutState();

    // 検証
    expect(getShipping()).toBeNull();
    expect(getPayment()).toBeNull();
  });

  test("削除失敗でも例外を投げない", ({ expect }) => {
    // 準備
    stubStorage({
      remove: () => {
        throw new Error("locked");
      },
    });

    // 実行と検証
    expect(() => clearCheckoutState()).not.toThrow();
  });
});

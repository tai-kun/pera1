import { describe, test, vi } from "vitest";

import { getCurrentUser, login, logout } from "./auth.js";

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

describe("getCurrentUser", () => {
  test("未ログインは null を返す", ({ expect }) => {
    // 準備
    stubStorage();

    // 実行と検証
    expect(getCurrentUser()).toBeNull();
  });

  test("保存済みのユーザーを復元する", async ({ expect }) => {
    // 準備
    stubStorage();
    await login("admin@example.com", "password");

    // 実行
    const user = getCurrentUser();

    // 検証
    expect(user?.id).toBe("1");
    expect(user?.role).toBe("admin");
  });

  test("名前なしはメールで補い admin 以外は user に倒す", ({ expect }) => {
    // 準備
    const store = stubStorage();
    store.set(
      "pera1-saas-project:current-user",
      JSON.stringify({ id: "9", email: "x@example.com", role: "super" }),
    );

    // 実行
    const user = getCurrentUser();

    // 検証
    expect(user?.name).toBe("x@example.com");
    expect(user?.role).toBe("user");
  });

  test("壊れた保存値は null を返す", ({ expect }) => {
    // 準備
    const store = stubStorage();
    store.set("pera1-saas-project:current-user", "{壊れた");

    // 実行と検証
    expect(getCurrentUser()).toBeNull();
  });

  test("id や email がなければ null を返す", ({ expect }) => {
    // 準備
    const store = stubStorage();
    store.set("pera1-saas-project:current-user", JSON.stringify({ id: 1 }));

    // 実行と検証
    expect(getCurrentUser()).toBeNull();
  });

  test("読み取り失敗は null を返す", ({ expect }) => {
    // 準備
    stubStorage({
      get: () => {
        throw new Error("locked");
      },
    });

    // 実行と検証
    expect(getCurrentUser()).toBeNull();
  });
});

describe("login", () => {
  test("正しい資格情報でユーザーを返す", async ({ expect }) => {
    // 準備
    stubStorage();

    // 実行
    const user = await login("alice@example.com", "password");

    // 検証
    expect(user?.name).toBe("Alice");
    expect(getCurrentUser()?.email).toBe("alice@example.com");
  });

  test("誤った資格情報は undefined を返す", async ({ expect }) => {
    // 準備
    stubStorage();

    // 実行と検証
    expect(await login("alice@example.com", "wrong")).toBeUndefined();
    expect(await login("nobody@example.com", "password")).toBeUndefined();
  });

  test("保存失敗は undefined を返す", async ({ expect }) => {
    // 準備
    stubStorage({
      set: () => {
        throw new Error("locked");
      },
    });

    // 実行と検証
    expect(await login("alice@example.com", "password")).toBeUndefined();
  });
});

describe("logout", () => {
  test("保存済みのユーザーを消す", async ({ expect }) => {
    // 準備
    stubStorage();
    await login("alice@example.com", "password");

    // 実行
    logout();

    // 検証
    expect(getCurrentUser()).toBeNull();
  });

  test("削除失敗でも例外を投げない", ({ expect }) => {
    // 準備
    stubStorage({
      remove: () => {
        throw new Error("locked");
      },
    });

    // 実行と検証
    expect(() => logout()).not.toThrow();
  });
});

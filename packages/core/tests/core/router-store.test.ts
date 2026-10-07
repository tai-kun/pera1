import { NinjaPromise } from "ninja-promise";
import { describe, test } from "vitest";

import {
  selectActionData,
  selectLoaderData,
  selectNavigationState,
} from "../../src/core/router-store.js";

describe("selectActionData", () => {
  test("対応するデータを取得できる", ({ expect }) => {
    // 準備
    function action() {
      return "ok";
    }
    const data = NinjaPromise.resolve("ok");
    const snapshot = {
      currentEntry: { id: "id-1", url: new URL("https://example.com/"), index: 0 },
      actionDataStore: new Map([["id-1", new Map([[action, data]])]]),
    } as any;

    // 実行
    const result = selectActionData(snapshot, action as any);

    // 検証
    expect(result).toBe(data);
  });

  test("未定義の action では undefined になる", ({ expect }) => {
    // 準備
    const snapshot = {
      currentEntry: { id: "id-1", url: new URL("https://example.com/"), index: 0 },
      actionDataStore: new Map(),
    } as any;

    // 実行と検証
    expect(selectActionData(snapshot, undefined)).toBeUndefined();
  });
});

describe("selectLoaderData", () => {
  test("対応するデータを取得できる", ({ expect }) => {
    // 準備
    function loader() {
      return "ok";
    }
    const data = NinjaPromise.resolve("ok");
    const snapshot = {
      currentEntry: { id: "id-1", url: new URL("https://example.com/"), index: 0 },
      loaderDataStore: new Map([["id-1", new Map([[loader, data]])]]),
    } as any;

    // 実行
    const result = selectLoaderData(snapshot, loader as any);

    // 検証
    expect(result).toBe(data);
  });

  test("未定義の loader では undefined になる", ({ expect }) => {
    // 準備
    const snapshot = {
      currentEntry: { id: "id-1", url: new URL("https://example.com/"), index: 0 },
      loaderDataStore: new Map(),
    } as any;

    // 実行と検証
    expect(selectLoaderData(snapshot, undefined)).toBeUndefined();
  });
});

describe("selectNavigationState", () => {
  test("データがなければ idle になる", ({ expect }) => {
    // 準備
    const snapshot = {
      currentEntry: { id: "id-1", url: new URL("https://example.com/"), index: 0 },
      actionDataStore: new Map(),
      loaderDataStore: new Map(),
    } as any;

    // 実行と検証
    expect(selectNavigationState(snapshot)).toBe("idle");
  });

  test("アクションが pending なら submitting になる", ({ expect }) => {
    // 準備
    function action() {
      return "ok";
    }
    const pending = NinjaPromise.withResolvers<string>().promise;
    const snapshot = {
      currentEntry: { id: "id-1", url: new URL("https://example.com/"), index: 0 },
      actionDataStore: new Map([["id-1", new Map([[action, pending]])]]),
      loaderDataStore: new Map(),
    } as any;

    // 実行と検証
    expect(selectNavigationState(snapshot)).toBe("submitting");
  });

  test("ローダーが pending なら loading になる", ({ expect }) => {
    // 準備
    function loader() {
      return "ok";
    }
    const pending = NinjaPromise.withResolvers<string>().promise;
    const snapshot = {
      currentEntry: { id: "id-1", url: new URL("https://example.com/"), index: 0 },
      actionDataStore: new Map(),
      loaderDataStore: new Map([["id-1", new Map([[loader, pending]])]]),
    } as any;

    // 実行と検証
    expect(selectNavigationState(snapshot)).toBe("loading");
  });

  test("両方が pending なら submitting を優先する", ({ expect }) => {
    // 準備
    function action() {
      return "ok";
    }
    function loader() {
      return "ok";
    }
    const pendingAction = NinjaPromise.withResolvers<string>().promise;
    const pendingLoader = NinjaPromise.withResolvers<string>().promise;
    const snapshot = {
      currentEntry: { id: "id-1", url: new URL("https://example.com/"), index: 0 },
      actionDataStore: new Map([["id-1", new Map([[action, pendingAction]])]]),
      loaderDataStore: new Map([["id-1", new Map([[loader, pendingLoader]])]]),
    } as any;

    // 実行と検証
    expect(selectNavigationState(snapshot)).toBe("submitting");
  });

  test("確定済みのみなら idle になる", ({ expect }) => {
    // 準備
    function action() {
      return "ok";
    }
    function loader() {
      return "ok";
    }
    const snapshot = {
      currentEntry: { id: "id-1", url: new URL("https://example.com/"), index: 0 },
      actionDataStore: new Map([["id-1", new Map([[action, NinjaPromise.resolve("ok")]])]]),
      loaderDataStore: new Map([["id-1", new Map([[loader, NinjaPromise.resolve("ok")]])]]),
    } as any;

    // 実行と検証
    expect(selectNavigationState(snapshot)).toBe("idle");
  });

  test("別エントリーの pending は無視する", ({ expect }) => {
    // 準備
    function loader() {
      return "ok";
    }
    const pending = NinjaPromise.withResolvers<string>().promise;
    const snapshot = {
      currentEntry: { id: "id-1", url: new URL("https://example.com/"), index: 0 },
      actionDataStore: new Map(),
      loaderDataStore: new Map([["id-2", new Map([[loader, pending]])]]),
    } as any;

    // 実行と検証
    expect(selectNavigationState(snapshot)).toBe("idle");
  });
});

describe("selectNavigationState の未初期化", () => {
  test("エントリーがなければ idle になる", ({ expect }) => {
    // 準備
    const snapshot = {
      actionDataStore: new Map(),
      loaderDataStore: new Map(),
    } as any;

    // 実行と検証
    expect(selectNavigationState(snapshot)).toBe("idle");
  });
});

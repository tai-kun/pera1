import { NinjaPromise } from "ninja-promise";
import { describe, test } from "vitest";

import { selectActionData, selectLoaderData } from "../../src/core/router-store.js";

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

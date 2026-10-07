import { describe, test, vi } from "vitest";

import { NavigationApiNotSupportedError } from "../../src/core/errors.js";
import NavigationApiEngine from "../../src/engines/navigation-api-engine.js";

describe("NavigationApiEngine", () => {
  test("Navigation API なしではエラーを投げる", async ({ expect }) => {
    // 準備
    await using cleanup = new AsyncDisposableStack();

    vi.stubGlobal("navigation", undefined);
    cleanup.defer(() => {
      vi.unstubAllGlobals();
    });

    // 実行と検証
    expect(() => new NavigationApiEngine()).toThrow(NavigationApiNotSupportedError);
  });

  test("init で currentEntry が無ければ null を返す", async ({ expect }) => {
    // 準備
    await using cleanup = new AsyncDisposableStack();

    vi.stubGlobal("navigation", {
      currentEntry: null,
      entries: () => [],
      addEventListener: () => {},
    });
    cleanup.defer(() => {
      vi.unstubAllGlobals();
    });

    const engine = new NavigationApiEngine();

    // 実行
    const result = engine.init({
      routes: [],
      getSignal: () => new AbortController().signal,
      loaderDataStore: new Map(),
    });

    // 検証
    expect(result).toBeNull();
  });

  test("submit FORM_DATA で form を DOM に追加して submit する", async ({ expect }) => {
    // 準備
    await using cleanup = new AsyncDisposableStack();

    vi.stubGlobal("navigation", {
      currentEntry: {
        id: "550e8400-e29b-41d4-a716-446655440000",
        url: "https://example.com/",
        index: 0,
        addEventListener: () => {},
      },
      entries: () => [],
      addEventListener: () => {},
      navigate: () => {},
      traverseTo: () => {},
    });
    cleanup.defer(() => {
      vi.unstubAllGlobals();
    });

    // 実行中にエンジンが DOM へ一時配置した送信用フォーム要素を掃除する
    cleanup.defer(() => {
      document.querySelector("form[data-pera1submit]")?.remove();
    });

    const engine = new NavigationApiEngine();
    const fd = new FormData();
    fd.set("x", "1");

    using submitSpy = vi.spyOn(HTMLFormElement.prototype, "submit").mockImplementation(() => {});

    // 実行
    engine.submit({
      type: "FORM_DATA",
      target: fd,
      action: "/test",
    });

    // 検証
    expect(submitSpy).toHaveBeenCalledOnce();
    const form = document.querySelector("form[data-pera1submit]");
    expect(form).not.toBeNull();
  });

  test("navigate STATIC で navigation.navigate を呼ぶ", async ({ expect }) => {
    // 準備
    await using cleanup = new AsyncDisposableStack();

    let navigatedPath = "";
    vi.stubGlobal("navigation", {
      currentEntry: {
        id: "550e8400-e29b-41d4-a716-446655440000",
        url: "https://example.com/",
        index: 0,
        addEventListener: () => {},
      },
      entries: () => [],
      addEventListener: () => {},
      navigate: (path: string) => {
        navigatedPath = path;
      },
      traverseTo: () => {},
    });
    cleanup.defer(() => {
      vi.unstubAllGlobals();
    });

    const engine = new NavigationApiEngine();

    // 実行
    engine.navigate({
      type: "LINK",
      to: {
        type: "STATIC",
        path: "/hello",
      },
      history: "push",
    });

    // 検証
    expect(navigatedPath).toBe("/hello");
  });

  test("navigate MOVE で traverseTo を呼ぶ", async ({ expect }) => {
    // 準備
    await using cleanup = new AsyncDisposableStack();

    let traversedKey = "";
    const validId = "550e8400-e29b-41d4-a716-446655440000";
    vi.stubGlobal("navigation", {
      currentEntry: {
        id: validId,
        url: "https://example.com/",
        index: 1,
        addEventListener: () => {},
      },
      entries: () => [
        { id: "a", index: 0, key: "key0" },
        { id: "b", index: 1, key: "key1" },
        { id: "c", index: 2, key: "key2" },
      ],
      addEventListener: () => {},
      navigate: () => {},
      traverseTo: (key: string) => {
        traversedKey = key;
      },
    });
    cleanup.defer(() => {
      vi.unstubAllGlobals();
    });

    const engine = new NavigationApiEngine();

    // 実行 - delta -1 で index 0 へ
    engine.navigate({
      type: "MOVE",
      delta: -1,
    });

    // 検証
    expect(traversedKey).toBe("key0");
  });
});

describe("監視の停止連動", () => {
  test("監視の停止に連動して進行中の遷移を中断する", ({ expect }) => {
    // 準備
    vi.stubGlobal("navigation", {
      currentEntry: null,
      entries: () => [],
      addEventListener: () => {},
    });
    const engine = new NavigationApiEngine();
    const controller = new AbortController();
    engine.start({
      routes: [],
      update: () => {},
      getSignal: () => controller.signal,
      actionDataStore: new Map(),
      loaderDataStore: new Map(),
    } as any);
    vi.unstubAllGlobals();

    // 実行
    controller.abort();

    // 検証
    expect((engine as unknown as { navAbortController: unknown }).navAbortController).toBeNull();
  });
});

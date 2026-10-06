import { describe, test, vi } from "vitest";

import processRoutes from "../../src/core/_process-routes.js";
import RedirectResponse from "../../src/core/redirect-response.js";
import NavigationApiEngine from "../../src/engines/navigation-api-engine.js";

const VALID_ID = "550e8400-e29b-41d4-a716-446655440000";

/**
 * テスト用の Navigation API モックを生成します。
 */
function createMockNavigation(overrides: any = {}) {
  const listeners = new Map<string, any>();
  const navigation: any = {
    currentEntry: {
      id: VALID_ID,
      url: "https://example.com/",
      index: 0,
      addEventListener: vi.fn<() => void>(),
    },
    entries: () => [],
    addEventListener: vi.fn<(type: string, handler: any) => void>((type: string, handler: any) => {
      listeners.set(type, handler);
    }),
    navigate: vi.fn<(url: string, options?: any) => void>(),
    traverseTo: vi.fn<() => void>(),
    ...overrides,
  };
  return { navigation, listeners };
}

describe("GET 遷移時の loader redirect", () => {
  test("同期的な redirect() は replace で自動遷移する", async ({ expect }) => {
    // 準備
    await using cleanup = new AsyncDisposableStack();
    const { navigation, listeners } = createMockNavigation({});
    vi.stubGlobal("navigation", navigation);
    cleanup.defer(() => {
      vi.unstubAllGlobals();
    });
    const engine = new NavigationApiEngine();
    const routes = processRoutes([
      { path: "/", loader: () => new RedirectResponse("/login") },
      { path: "/login", loader: () => "login-data" },
    ]);
    const update = vi.fn<() => void>();
    engine.start({
      routes: routes as any,
      update: update as any,
      getSignal: () => new AbortController().signal,
      actionDataStore: new Map() as any,
      loaderDataStore: new Map() as any,
    });

    // 実行
    let captured: any = null;
    listeners.get("navigate")({
      isTrusted: true,
      canIntercept: true,
      hashChange: false,
      downloadRequest: null,
      navigationType: "push",
      destination: { url: "https://example.com/" },
      intercept: (args: any) => {
        captured = args;
      },
    });
    await captured.handler();

    // 検証
    expect(update).toHaveBeenCalled();
    expect(navigation.navigate).toHaveBeenCalledWith("/login", { history: "replace" });
  });

  test("非同期の redirect() も自動遷移する", async ({ expect }) => {
    // 準備
    await using cleanup = new AsyncDisposableStack();
    const { navigation, listeners } = createMockNavigation({});
    vi.stubGlobal("navigation", navigation);
    cleanup.defer(() => {
      vi.unstubAllGlobals();
    });
    const engine = new NavigationApiEngine();
    const routes = processRoutes([
      { path: "/", loader: () => Promise.resolve(new RedirectResponse("/login")) },
      { path: "/login", loader: () => "login-data" },
    ]);
    const update = vi.fn<() => void>();
    engine.start({
      routes: routes as any,
      update: update as any,
      getSignal: () => new AbortController().signal,
      actionDataStore: new Map() as any,
      loaderDataStore: new Map() as any,
    });

    // 実行
    let captured: any = null;
    listeners.get("navigate")({
      isTrusted: true,
      canIntercept: true,
      hashChange: false,
      downloadRequest: null,
      navigationType: "push",
      destination: { url: "https://example.com/" },
      intercept: (args: any) => {
        captured = args;
      },
    });
    await captured.handler();

    // 検証
    expect(navigation.navigate).toHaveBeenCalledWith("/login", { history: "replace" });
  });

  test("通常データの場合は遷移しない", async ({ expect }) => {
    // 準備
    await using cleanup = new AsyncDisposableStack();
    const { navigation, listeners } = createMockNavigation({});
    vi.stubGlobal("navigation", navigation);
    cleanup.defer(() => {
      vi.unstubAllGlobals();
    });
    const engine = new NavigationApiEngine();
    const routes = processRoutes([{ path: "/", loader: () => "data" }]);
    const update = vi.fn<() => void>();
    engine.start({
      routes: routes as any,
      update: update as any,
      getSignal: () => new AbortController().signal,
      actionDataStore: new Map() as any,
      loaderDataStore: new Map() as any,
    });

    // 実行
    let captured: any = null;
    listeners.get("navigate")({
      isTrusted: true,
      canIntercept: true,
      hashChange: false,
      downloadRequest: null,
      navigationType: "push",
      destination: { url: "https://example.com/" },
      intercept: (args: any) => {
        captured = args;
      },
    });
    await captured.handler();

    // 検証
    expect(update).toHaveBeenCalled();
    expect(navigation.navigate).not.toHaveBeenCalled();
  });

  test("同一 URL へのリダイレクトでは遷移しない", async ({ expect }) => {
    // 準備
    await using cleanup = new AsyncDisposableStack();
    const { navigation, listeners } = createMockNavigation({});
    vi.stubGlobal("navigation", navigation);
    cleanup.defer(() => {
      vi.unstubAllGlobals();
    });
    const engine = new NavigationApiEngine();
    const routes = processRoutes([{ path: "/", loader: () => new RedirectResponse("/") }]);
    const update = vi.fn<() => void>();
    engine.start({
      routes: routes as any,
      update: update as any,
      getSignal: () => new AbortController().signal,
      actionDataStore: new Map() as any,
      loaderDataStore: new Map() as any,
    });

    // 実行
    let captured: any = null;
    listeners.get("navigate")({
      isTrusted: true,
      canIntercept: true,
      hashChange: false,
      downloadRequest: null,
      navigationType: "push",
      destination: { url: "https://example.com/" },
      intercept: (args: any) => {
        captured = args;
      },
    });
    await captured.handler();

    // 検証: 自己リダイレクトによる無限ループを防ぐ
    expect(navigation.navigate).not.toHaveBeenCalled();
  });
});

describe("POST 後の loader redirect", () => {
  test("アクション後のローダーが redirect() を返したら自動遷移する", async ({ expect }) => {
    // 準備
    await using cleanup = new AsyncDisposableStack();
    const currentEntry: any = {
      id: VALID_ID,
      url: "https://example.com/",
      index: 0,
      addEventListener: () => {},
    };
    const { navigation, listeners } = createMockNavigation({ currentEntry });
    vi.stubGlobal("navigation", navigation);
    cleanup.defer(() => {
      vi.unstubAllGlobals();
    });
    const engine = new NavigationApiEngine();
    const routes = processRoutes([
      {
        path: "/",
        action: () => "action-result",
        loader: () => Promise.resolve(new RedirectResponse("/login")),
      },
      { path: "/login", loader: () => "login-data" },
    ]);
    const update = vi.fn<() => void>();
    engine.start({
      routes: routes as any,
      update: update as any,
      getSignal: () => new AbortController().signal,
      actionDataStore: new Map() as any,
      loaderDataStore: new Map() as any,
    });

    // 実行
    let captured: any = null;
    const fd = new FormData();
    fd.set("x", "1");
    listeners.get("navigate")({
      isTrusted: true,
      canIntercept: true,
      hashChange: false,
      downloadRequest: null,
      navigationType: "push",
      destination: { url: "https://example.com/" },
      formData: fd,
      sourceElement: null,
      intercept: (args: any) => {
        captured = args;
      },
    });
    await captured.precommitHandler({ redirect: vi.fn<() => void>() });
    await captured.handler();

    // 検証
    expect(navigation.navigate).toHaveBeenCalledWith("/login", { history: "replace" });
  });
});

describe("初回表示時の loader redirect", () => {
  test("init 後に start すると初期ローダーの redirect で自動遷移する", async ({ expect }) => {
    // 準備
    await using cleanup = new AsyncDisposableStack();
    const { navigation } = createMockNavigation({
      currentEntry: {
        id: VALID_ID,
        url: "https://example.com/dashboard",
        index: 0,
        addEventListener: () => {},
      },
    });
    vi.stubGlobal("navigation", navigation);
    cleanup.defer(() => {
      vi.unstubAllGlobals();
    });
    const engine = new NavigationApiEngine();
    const routes = processRoutes([
      { path: "/dashboard", loader: () => new RedirectResponse("/login") },
      { path: "/login", loader: () => "login-data" },
    ]);
    const store = new Map() as any;

    // 実行
    const initResult = engine.init({
      routes: routes as any,
      getSignal: () => new AbortController().signal,
      loaderDataStore: store,
    });
    expect(initResult).not.toBeNull();
    engine.start({
      routes: routes as any,
      update: (() => {}) as any,
      getSignal: () => new AbortController().signal,
      actionDataStore: new Map() as any,
      loaderDataStore: store,
    });
    // 非同期の監視ハンドラーを消化する
    await new Promise((resolve) => setTimeout(resolve, 0));

    // 検証
    expect(navigation.navigate).toHaveBeenCalledWith("/login", { history: "replace" });
  });
});

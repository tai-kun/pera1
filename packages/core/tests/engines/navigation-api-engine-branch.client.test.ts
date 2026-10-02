import { describe, test, vi } from "vitest";

import processRoutes from "../../src/core/_process-routes.js";
import { NavigationApiNotSupportedError, UnreachableError } from "../../src/core/errors.js";
import NavigationApiEngine from "../../src/engines/navigation-api-engine.js";

const VALID_ID = "550e8400-e29b-41d4-a716-446655440000";
const VALID_ID_2 = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";

/**
 * テスト用の Navigation API モックを生成します。
 * navigate/currententrychange ハンドラーを外部から発火できるように保持します。
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
    navigate: vi.fn<() => void>(),
    traverseTo: vi.fn<() => void>(),
    ...overrides,
  };
  return { navigation, listeners };
}

describe("コンストラクタの分岐", () => {
  test("window アクセスで例外が出てもエラーを投げる", async ({ expect }) => {
    // 準備
    await using cleanup = new AsyncDisposableStack();
    // bare `navigation` の評価で例外が出るようグローバルを削除し、
    // window.navigation の取得でも例外が出るよう getter を仕掛ける
    const origWindowDesc = Object.getOwnPropertyDescriptor(window, "navigation");
    const origGlobalDesc = Object.getOwnPropertyDescriptor(globalThis, "navigation");
    try {
      Object.defineProperty(window, "navigation", {
        get() {
          throw new Error("no navigation");
        },
        configurable: true,
      });
    } catch {
      // 定義できない環境ではスキップ相当として何もしない
    }
    cleanup.defer(() => {
      try {
        if (origWindowDesc) {
          Object.defineProperty(window, "navigation", origWindowDesc);
        }
      } catch {}
      try {
        if (origGlobalDesc) {
          Object.defineProperty(globalThis, "navigation", origGlobalDesc);
        }
      } catch {}
      vi.unstubAllGlobals();
    });

    // 実行と検証
    expect(() => new NavigationApiEngine()).toThrow(NavigationApiNotSupportedError);
  });
});

describe("init の分岐", () => {
  test("url が null の currentEntry では null を返す", async ({ expect }) => {
    // 準備
    await using cleanup = new AsyncDisposableStack();
    const { navigation } = createMockNavigation({
      currentEntry: { id: VALID_ID, url: null, index: 0, addEventListener: () => {} },
    });
    vi.stubGlobal("navigation", navigation);
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

  test("index が -1 の currentEntry では null を返す", async ({ expect }) => {
    // 準備
    await using cleanup = new AsyncDisposableStack();
    const { navigation } = createMockNavigation({
      currentEntry: {
        id: VALID_ID,
        url: "https://example.com/",
        index: -1,
        addEventListener: () => {},
      },
    });
    vi.stubGlobal("navigation", navigation);
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

  test("マッチするルートがないとき null を返す", async ({ expect }) => {
    // 準備
    await using cleanup = new AsyncDisposableStack();
    const { navigation } = createMockNavigation({});
    vi.stubGlobal("navigation", navigation);
    cleanup.defer(() => {
      vi.unstubAllGlobals();
    });
    const engine = new NavigationApiEngine();
    const routes = processRoutes([{ path: "/exists" }]);

    // 実行
    const result = engine.init({
      routes: routes as any,
      getSignal: () => new AbortController().signal,
      loaderDataStore: new Map(),
    });

    // 検証
    expect(result).toBeNull();
  });

  test("マッチするルートがあるとき entry と routes を返しストアに登録する", async ({ expect }) => {
    // 準備
    await using cleanup = new AsyncDisposableStack();
    const { navigation } = createMockNavigation({});
    vi.stubGlobal("navigation", navigation);
    cleanup.defer(() => {
      vi.unstubAllGlobals();
    });
    const engine = new NavigationApiEngine();
    const routes = processRoutes([{ path: "/", loader: () => "data" }]);
    const store = new Map();

    // 実行
    const result = engine.init({
      routes: routes as any,
      getSignal: () => new AbortController().signal,
      loaderDataStore: store as any,
    });

    // 検証
    expect(result).not.toBeNull();
    expect(result!.entry.id).toBe(VALID_ID);
    expect(result!.routes.length).toBeGreaterThan(0);
    expect(store.has(VALID_ID as any)).toBe(true);
  });
});

describe("start のナビゲーションガード", () => {
  test("isTrusted が falsy なら何もしない", async ({ expect }) => {
    // 準備
    await using cleanup = new AsyncDisposableStack();
    const { navigation, listeners } = createMockNavigation({});
    vi.stubGlobal("navigation", navigation);
    cleanup.defer(() => {
      vi.unstubAllGlobals();
    });
    const engine = new NavigationApiEngine();
    const update = vi.fn<() => void>();
    engine.start({
      routes: [],
      update: update as any,
      getSignal: () => new AbortController().signal,
      actionDataStore: new Map() as any,
      loaderDataStore: new Map() as any,
    });

    // 実行
    const handler = listeners.get("navigate");
    handler({
      isTrusted: false,
      canIntercept: true,
      hashChange: false,
      downloadRequest: null,
      navigationType: "push",
    });

    // 検証
    expect(update).not.toHaveBeenCalled();
  });

  test("canIntercept が falsy なら何もしない", async ({ expect }) => {
    // 準備
    await using cleanup = new AsyncDisposableStack();
    const { navigation, listeners } = createMockNavigation({});
    vi.stubGlobal("navigation", navigation);
    cleanup.defer(() => {
      vi.unstubAllGlobals();
    });
    const engine = new NavigationApiEngine();
    const update = vi.fn<() => void>();
    engine.start({
      routes: [],
      update: update as any,
      getSignal: () => new AbortController().signal,
      actionDataStore: new Map() as any,
      loaderDataStore: new Map() as any,
    });

    // 実行
    listeners.get("navigate")({
      isTrusted: true,
      canIntercept: false,
      hashChange: false,
      downloadRequest: null,
      navigationType: "push",
    });

    // 検証
    expect(update).not.toHaveBeenCalled();
  });

  test("hashChange では何もしない", async ({ expect }) => {
    // 準備
    await using cleanup = new AsyncDisposableStack();
    const { navigation, listeners } = createMockNavigation({});
    vi.stubGlobal("navigation", navigation);
    cleanup.defer(() => {
      vi.unstubAllGlobals();
    });
    const engine = new NavigationApiEngine();
    const update = vi.fn<() => void>();
    engine.start({
      routes: [],
      update: update as any,
      getSignal: () => new AbortController().signal,
      actionDataStore: new Map() as any,
      loaderDataStore: new Map() as any,
    });

    // 実行
    listeners.get("navigate")({
      isTrusted: true,
      canIntercept: true,
      hashChange: true,
      downloadRequest: null,
      navigationType: "push",
    });

    // 検証
    expect(update).not.toHaveBeenCalled();
  });

  test("downloadRequest があるときは何もしない", async ({ expect }) => {
    // 準備
    await using cleanup = new AsyncDisposableStack();
    const { navigation, listeners } = createMockNavigation({});
    vi.stubGlobal("navigation", navigation);
    cleanup.defer(() => {
      vi.unstubAllGlobals();
    });
    const engine = new NavigationApiEngine();
    const update = vi.fn<() => void>();
    engine.start({
      routes: [],
      update: update as any,
      getSignal: () => new AbortController().signal,
      actionDataStore: new Map() as any,
      loaderDataStore: new Map() as any,
    });

    // 実行
    listeners.get("navigate")({
      isTrusted: true,
      canIntercept: true,
      hashChange: false,
      downloadRequest: {},
      navigationType: "push",
    });

    // 検証
    expect(update).not.toHaveBeenCalled();
  });

  test("reload では何もしない", async ({ expect }) => {
    // 準備
    await using cleanup = new AsyncDisposableStack();
    const { navigation, listeners } = createMockNavigation({});
    vi.stubGlobal("navigation", navigation);
    cleanup.defer(() => {
      vi.unstubAllGlobals();
    });
    const engine = new NavigationApiEngine();
    const update = vi.fn<() => void>();
    engine.start({
      routes: [],
      update: update as any,
      getSignal: () => new AbortController().signal,
      actionDataStore: new Map() as any,
      loaderDataStore: new Map() as any,
    });

    // 実行
    listeners.get("navigate")({
      isTrusted: true,
      canIntercept: true,
      hashChange: false,
      downloadRequest: null,
      navigationType: "reload",
    });

    // 検証
    expect(update).not.toHaveBeenCalled();
  });

  test("currentEntry がなければ update(null) で intercept する", async ({ expect }) => {
    // 準備
    await using cleanup = new AsyncDisposableStack();
    const { navigation, listeners } = createMockNavigation({
      currentEntry: null,
    });
    vi.stubGlobal("navigation", navigation);
    cleanup.defer(() => {
      vi.unstubAllGlobals();
    });
    const engine = new NavigationApiEngine();
    const update = vi.fn<() => void>();
    engine.start({
      routes: [],
      update: update as any,
      getSignal: () => new AbortController().signal,
      actionDataStore: new Map() as any,
      loaderDataStore: new Map() as any,
    });

    // 実行
    let captured: any = null;
    const event: any = {
      isTrusted: true,
      canIntercept: true,
      hashChange: false,
      downloadRequest: null,
      navigationType: "push",
      intercept: (args: any) => {
        captured = args;
      },
    };
    listeners.get("navigate")(event);
    await captured.handler();

    // 検証
    expect(update).toHaveBeenCalledWith(null);
  });

  test("遷移先にマッチするルートがなければ update(null) で intercept する", async ({ expect }) => {
    // 準備
    await using cleanup = new AsyncDisposableStack();
    const { navigation, listeners } = createMockNavigation({});
    vi.stubGlobal("navigation", navigation);
    cleanup.defer(() => {
      vi.unstubAllGlobals();
    });
    const engine = new NavigationApiEngine();
    const routes = processRoutes([{ path: "/exists" }]);
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
      destination: { url: "https://example.com/notfound" },
      intercept: (args: any) => {
        captured = args;
      },
    });
    await captured.handler();

    // 検証
    expect(update).toHaveBeenCalledWith(null);
  });
});

describe("start の GET 遷移（formData なし）", () => {
  test("正常な GET 遷移で update が呼ばれる", async ({ expect }) => {
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
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ entry: expect.anything(), routes: expect.anything() }),
    );
  });

  test("GET 遷移で currentEntry がなければ update(null) になる", async ({ expect }) => {
    // 準備
    await using cleanup = new AsyncDisposableStack();
    let callCount = 0;
    const { navigation, listeners } = createMockNavigation({});
    // 最初の currentEntry（ガード用）は有効、handler 内で null になるよう差し替え
    vi.stubGlobal("navigation", navigation);
    cleanup.defer(() => {
      vi.unstubAllGlobals();
    });
    const engine = new NavigationApiEngine();
    const routes = processRoutes([{ path: "/" }]);
    const update = vi.fn<() => void>();
    engine.start({
      routes: routes as any,
      update: update as any,
      getSignal: () => new AbortController().signal,
      actionDataStore: new Map() as any,
      loaderDataStore: new Map() as any,
    });

    // 実行: handler 実行直前に currentEntry を null にする
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
    navigation.currentEntry = null;
    callCount += 1;
    await captured.handler();
    expect(callCount).toBe(1);

    // 検証
    expect(update).toHaveBeenCalledWith(null);
  });

  test("GET 遷移で URL がずれていれば何もしない", async ({ expect }) => {
    // 準備
    await using cleanup = new AsyncDisposableStack();
    const { navigation, listeners } = createMockNavigation({
      currentEntry: {
        id: VALID_ID,
        url: "https://example.com/",
        index: 0,
        addEventListener: () => {},
      },
    });
    vi.stubGlobal("navigation", navigation);
    cleanup.defer(() => {
      vi.unstubAllGlobals();
    });
    const engine = new NavigationApiEngine();
    const routes = processRoutes([{ path: "/" }, { path: "/other" }]);
    const update = vi.fn<() => void>();
    engine.start({
      routes: routes as any,
      update: update as any,
      getSignal: () => new AbortController().signal,
      actionDataStore: new Map() as any,
      loaderDataStore: new Map() as any,
    });

    // 実行: destination は /other だが handler 実行時に currentEntry を / に戻す（不一致）
    let captured: any = null;
    listeners.get("navigate")({
      isTrusted: true,
      canIntercept: true,
      hashChange: false,
      downloadRequest: null,
      navigationType: "push",
      destination: { url: "https://example.com/other" },
      intercept: (args: any) => {
        captured = args;
      },
    });
    // currentEntry は "/" のままなので destUrl（/other）と不一致 -> ガードで return
    // 実際は currentEntry.url が destUrl と一致しないケースを作るため、
    // navigation.currentEntry を書き換えず destination だけ /other にしているが、
    // handleNavigate 内の prevEntry は "/"、dest は "/other" で一致チェックは handler 内で
    // currentEntry.url.href !== destUrl.href となる。currentEntry は "/" のままなので不一致になる。
    // そのため update は呼ばれないはず。ただし destRoutes は /other で存在する。
    // ここでは currentEntry を "/" に保つことで不一致を再現するが、
    // 実装は handler 内で this.navigation.currentEntry を再取得するため、
    // currentEntry が "/" のままなら destUrl（/other）と不一致で return する。
    await captured.handler();

    // 検証
    expect(update).not.toHaveBeenCalled();
  });
});

describe("start の POST 遷移（formData あり）", () => {
  test("action がないときは何もせず終了する", async ({ expect }) => {
    // 準備
    await using cleanup = new AsyncDisposableStack();
    const { navigation, listeners } = createMockNavigation({});
    vi.stubGlobal("navigation", navigation);
    cleanup.defer(() => {
      vi.unstubAllGlobals();
    });
    const engine = new NavigationApiEngine();
    // action なしのルート
    const routes = processRoutes([{ path: "/" }]);
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
      formData: new FormData(),
      sourceElement: null,
      intercept: (args: any) => {
        captured = args;
      },
    });
    await captured.precommitHandler({ redirect: vi.fn<() => void>() });
    await captured.handler();

    // 検証
    expect(update).not.toHaveBeenCalled();
  });

  test("data-pera1submit のフォーム要素は削除される", async ({ expect }) => {
    // 準備
    await using cleanup = new AsyncDisposableStack();
    const { navigation, listeners } = createMockNavigation({});
    vi.stubGlobal("navigation", navigation);
    cleanup.defer(() => {
      vi.unstubAllGlobals();
    });
    const engine = new NavigationApiEngine();
    const routes = processRoutes([{ path: "/", action: () => "ok" }]);
    const update = vi.fn<() => void>();
    engine.start({
      routes: routes as any,
      update: update as any,
      getSignal: () => new AbortController().signal,
      actionDataStore: new Map() as any,
      loaderDataStore: new Map() as any,
    });

    // data-pera1submit 付きのフォームを用意
    const form = document.createElement("form");
    form.setAttribute("data-pera1submit", "");
    document.body.appendChild(form);
    cleanup.defer(() => {
      form.remove();
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
      sourceElement: form,
      intercept: (args: any) => {
        captured = args;
      },
    });
    const redirect = vi.fn<() => void>();
    await captured.precommitHandler({ redirect });
    await captured.handler();

    // 検証: フォームが削除されている
    expect(document.body.contains(form)).toBe(false);
  });

  test("action が成功（fulfilled、リダイレクトなし）して GET ローダーが走る", async ({
    expect,
  }) => {
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
    const loader = vi.fn<() => string>(() => "loader-data");
    const routes = processRoutes([{ path: "/", action: () => "action-result", loader }]);
    const update = vi.fn<() => void>();
    const actionStore = new Map() as any;
    const loaderStore = new Map() as any;
    engine.start({
      routes: routes as any,
      update: update as any,
      getSignal: () => new AbortController().signal,
      actionDataStore: actionStore,
      loaderDataStore: loaderStore,
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
    const redirect = vi.fn<() => void>();
    await captured.precommitHandler({ redirect });
    // precommit で redirect が呼ばれる（リダイレクトなしでも currentEntry.url への redirect）
    expect(redirect).toHaveBeenCalled();
    await captured.handler();

    // 検証
    expect(loader).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        routes: expect.arrayContaining([expect.objectContaining({ path: "/" })]),
      }),
    );
  });

  test("action が失敗（rejected）したら元の URL に redirect する", async ({ expect }) => {
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
        action: () => {
          throw new Error("fail");
        },
      },
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
    const redirect = vi.fn<() => void>();
    await captured.precommitHandler({ redirect });

    // 検証
    expect(redirect).toHaveBeenCalledWith("/");
  });

  test("POST 後の handler で currentEntry がなければ update(null)", async ({ expect }) => {
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
    const routes = processRoutes([{ path: "/", action: () => "ok" }]);
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
      formData: new FormData(),
      sourceElement: null,
      intercept: (args: any) => {
        captured = args;
      },
    });
    await captured.precommitHandler({ redirect: vi.fn<() => void>() });
    navigation.currentEntry = null;
    await captured.handler();

    // 検証
    expect(update).toHaveBeenCalledWith(null);
  });

  test("POST 後の handler で URL がずれていれば何もしない", async ({ expect }) => {
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
    const routes = processRoutes([{ path: "/", action: () => "ok" }]);
    const update = vi.fn<() => void>();
    // update の呼び出し回数を記録（precommit で 1 回呼ばれる）
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
      formData: new FormData(),
      sourceElement: null,
      intercept: (args: any) => {
        captured = args;
      },
    });
    await captured.precommitHandler({ redirect: vi.fn<() => void>() });
    const callsAfterPrecommit = update.mock.calls.length;
    // handler 実行時に URL をずらす
    navigation.currentEntry = {
      id: VALID_ID_2,
      url: "https://example.com/other",
      index: 1,
      addEventListener: () => {},
    };
    await captured.handler();

    // 検証: handler では追加の update がない（precommit の分のみ）
    expect(update.mock.calls.length).toBe(callsAfterPrecommit);
  });

  test("POST 後の handler でマッチなしなら update(null)", async ({ expect }) => {
    // 準備
    await using cleanup = new AsyncDisposableStack();
    const currentEntry: any = {
      id: VALID_ID,
      url: "https://example.com/a",
      index: 0,
      addEventListener: () => {},
    };
    const { navigation, listeners } = createMockNavigation({ currentEntry });
    vi.stubGlobal("navigation", navigation);
    cleanup.defer(() => {
      vi.unstubAllGlobals();
    });
    const engine = new NavigationApiEngine();
    // "/" を含めず "/a" のみにすることで、リダイレクト先 "/b-notfound" がマッチなしになる
    const { default: RedirectResponse } = await import("../../src/core/redirect-response.js");
    const routes = processRoutes([
      { path: "/a", action: () => new RedirectResponse("/b-notfound") },
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
      destination: { url: "https://example.com/a" },
      formData: new FormData(),
      sourceElement: null,
      intercept: (args: any) => {
        captured = args;
      },
    });
    let redirectedTo = "";
    await captured.precommitHandler({
      redirect: (p: string) => {
        redirectedTo = p;
      },
    });
    // redirect 先に currentEntry を合わせるが、そのパスは routes にない
    expect(redirectedTo).toContain("b-notfound");
    navigation.currentEntry = {
      id: VALID_ID_2,
      url: `https://example.com${redirectedTo}`,
      index: 1,
      addEventListener: () => {},
    };
    await captured.handler();

    // 検証
    expect(update).toHaveBeenCalledWith(null);
  });
});

describe("start の購読管理", () => {
  test("entries の dispose でストアから削除される", async ({ expect }) => {
    // 準備
    await using cleanup = new AsyncDisposableStack();
    const disposeHandlers = new Map<string, any>();
    const entry1: any = {
      id: VALID_ID,
      index: 0,
      key: "k1",
      addEventListener: vi.fn<(type: string, handler: any) => void>(
        (type: string, handler: any) => {
          disposeHandlers.set(`${VALID_ID}:${type}`, handler);
        },
      ),
    };
    const { navigation } = createMockNavigation({
      currentEntry: {
        id: VALID_ID,
        url: "https://example.com/",
        index: 0,
        addEventListener: () => {},
      },
      entries: () => [entry1],
    });
    vi.stubGlobal("navigation", navigation);
    cleanup.defer(() => {
      vi.unstubAllGlobals();
    });
    const engine = new NavigationApiEngine();
    const actionStore = new Map() as any;
    const loaderStore = new Map() as any;
    actionStore.set(VALID_ID as any, new Map());
    loaderStore.set(VALID_ID as any, new Map());
    const ac = new AbortController();
    engine.start({
      routes: [],
      update: (() => {}) as any,
      getSignal: () => ac.signal,
      actionDataStore: actionStore,
      loaderDataStore: loaderStore,
    });

    // 実行
    const dispose = disposeHandlers.get(`${VALID_ID}:dispose`);
    expect(dispose).toBeDefined();
    dispose();

    // 検証
    expect(actionStore.has(VALID_ID as any)).toBe(false);
    expect(loaderStore.has(VALID_ID as any)).toBe(false);
  });

  test("既に購読済みの entry はスキップされる", async ({ expect }) => {
    // 準備
    await using cleanup = new AsyncDisposableStack();
    let addCount = 0;
    const entry1: any = {
      id: VALID_ID,
      index: 0,
      key: "k1",
      addEventListener: () => {
        addCount += 1;
      },
    };
    const { navigation, listeners } = createMockNavigation({
      currentEntry: {
        id: VALID_ID,
        url: "https://example.com/",
        index: 0,
        addEventListener: () => {},
      },
      entries: () => [entry1],
    });
    vi.stubGlobal("navigation", navigation);
    cleanup.defer(() => {
      vi.unstubAllGlobals();
    });
    const engine = new NavigationApiEngine();
    const ac = new AbortController();
    const args: any = {
      routes: [],
      update: (() => {}) as any,
      getSignal: () => ac.signal,
      actionDataStore: new Map(),
      loaderDataStore: new Map(),
    };
    engine.start(args);
    const firstCount = addCount;
    // 2 回目の start で同じ entry はスキップされる（subscribedEntryIds に残っている）
    engine.start(args);

    // 検証
    expect(addCount).toBe(firstCount);
    expect(listeners.get("navigate")).toBeDefined();
  });

  test("currententrychange で新しい entry を購読する", async ({ expect }) => {
    // 準備
    await using cleanup = new AsyncDisposableStack();
    const { navigation, listeners } = createMockNavigation({
      currentEntry: {
        id: VALID_ID,
        url: "https://example.com/",
        index: 0,
        addEventListener: () => {},
      },
      entries: () => [],
    });
    vi.stubGlobal("navigation", navigation);
    cleanup.defer(() => {
      vi.unstubAllGlobals();
    });
    const engine = new NavigationApiEngine();
    const actionStore = new Map() as any;
    const loaderStore = new Map() as any;
    engine.start({
      routes: [],
      update: (() => {}) as any,
      getSignal: () => new AbortController().signal,
      actionDataStore: actionStore,
      loaderDataStore: loaderStore,
    });

    // 実行: currentEntry を新しい ID に変えてイベント発火
    let capturedDispose: any = null;
    navigation.currentEntry = {
      id: VALID_ID_2,
      url: "https://example.com/2",
      index: 1,
      addEventListener: (_type: string, handler: any) => {
        capturedDispose = handler;
      },
    };
    listeners.get("currententrychange")();

    // 検証: dispose ハンドラーが登録され、呼ぶとストアから削除される
    expect(capturedDispose).toBeDefined();
    actionStore.set(VALID_ID_2 as any, new Map());
    loaderStore.set(VALID_ID_2 as any, new Map());
    capturedDispose();
    expect(actionStore.has(VALID_ID_2 as any)).toBe(false);
    expect(loaderStore.has(VALID_ID_2 as any)).toBe(false);
  });

  test("currententrychange で既に購読済みなら何もしない", async ({ expect }) => {
    // 準備
    await using cleanup = new AsyncDisposableStack();
    const { navigation, listeners } = createMockNavigation({
      currentEntry: {
        id: VALID_ID,
        url: "https://example.com/",
        index: 0,
        addEventListener: () => {},
      },
      entries: () => [],
    });
    vi.stubGlobal("navigation", navigation);
    cleanup.defer(() => {
      vi.unstubAllGlobals();
    });
    const engine = new NavigationApiEngine();
    engine.start({
      routes: [],
      update: (() => {}) as any,
      getSignal: () => new AbortController().signal,
      actionDataStore: new Map() as any,
      loaderDataStore: new Map() as any,
    });

    // 実行: 同じ ID で currententrychange を 2 回発火（2 回目は購読済みで早期リターン）
    let addCount = 0;
    navigation.currentEntry = {
      id: VALID_ID_2,
      url: "https://example.com/2",
      index: 1,
      addEventListener: () => {
        addCount += 1;
      },
    };
    listeners.get("currententrychange")();
    const firstCount = addCount;
    listeners.get("currententrychange")();

    // 検証
    expect(addCount).toBe(firstCount);
  });

  test("currententrychange で currentEntry がなければ何もしない", async ({ expect }) => {
    // 準備
    await using cleanup = new AsyncDisposableStack();
    const { navigation, listeners } = createMockNavigation({ currentEntry: null });
    vi.stubGlobal("navigation", navigation);
    cleanup.defer(() => {
      vi.unstubAllGlobals();
    });
    const engine = new NavigationApiEngine();
    engine.start({
      routes: [],
      update: (() => {}) as any,
      getSignal: () => new AbortController().signal,
      actionDataStore: new Map() as any,
      loaderDataStore: new Map() as any,
    });

    // 実行と検証（投げないこと）
    navigation.currentEntry = null;
    expect(() => listeners.get("currententrychange")()).not.toThrow();
  });
});

describe("submit の分岐", () => {
  test("URL_SEARCH_PARAMS で navigation.navigate を呼ぶ", async ({ expect }) => {
    // 準備
    await using cleanup = new AsyncDisposableStack();
    const { navigation } = createMockNavigation({});
    vi.stubGlobal("navigation", navigation);
    cleanup.defer(() => {
      vi.unstubAllGlobals();
    });
    const engine = new NavigationApiEngine();

    // 実行
    engine.submit({
      type: "URL_SEARCH_PARAMS",
      target: new URLSearchParams("a=1&b=2") as any,
      action: "/search",
      history: "push",
    });

    // 検証
    expect(navigation.navigate).toHaveBeenCalledWith(expect.stringContaining("/search"), {
      history: "push",
    });
  });

  test("不正な submit タイプでは UnreachableError を投げる", async ({ expect }) => {
    // 準備
    await using cleanup = new AsyncDisposableStack();
    const { navigation } = createMockNavigation({});
    vi.stubGlobal("navigation", navigation);
    cleanup.defer(() => {
      vi.unstubAllGlobals();
    });
    const engine = new NavigationApiEngine();

    // 実行と検証
    expect(() => engine.submit({ type: "INVALID" } as any)).toThrow(UnreachableError);
  });
});

describe("navigate の分岐", () => {
  test("DYNAMIC で URL が変わるとき navigate を呼ぶ", async ({ expect }) => {
    // 準備
    await using cleanup = new AsyncDisposableStack();
    const { navigation } = createMockNavigation({});
    vi.stubGlobal("navigation", navigation);
    cleanup.defer(() => {
      vi.unstubAllGlobals();
    });
    const engine = new NavigationApiEngine();

    // 実行: 現在の location とは確実に異なるパスへ変更する
    engine.navigate({
      type: "LINK",
      to: {
        type: "DYNAMIC",
        patch: (p: any) => {
          p.pathname = "/changed-xyz-12345";
        },
      },
      history: "push",
    });

    // 検証
    expect(navigation.navigate).toHaveBeenCalledWith(
      expect.stringContaining("/changed-xyz-12345"),
      { history: "push" },
    );
  });

  test("DYNAMIC で URL が変わらなければ navigate を呼ばない", async ({ expect }) => {
    // 準備
    await using cleanup = new AsyncDisposableStack();
    const { navigation } = createMockNavigation({});
    vi.stubGlobal("navigation", navigation);
    cleanup.defer(() => {
      vi.unstubAllGlobals();
    });
    const engine = new NavigationApiEngine();

    // 実行: patch が何も変更しないので navigate されない
    engine.navigate({
      type: "LINK",
      to: { type: "DYNAMIC", patch: () => {} },
      history: "push",
    });

    // 検証
    expect(navigation.navigate).not.toHaveBeenCalled();
  });

  test("MOVE で currentEntry がなければ何もしない", async ({ expect }) => {
    // 準備
    await using cleanup = new AsyncDisposableStack();
    const { navigation } = createMockNavigation({ currentEntry: null });
    vi.stubGlobal("navigation", navigation);
    cleanup.defer(() => {
      vi.unstubAllGlobals();
    });
    const engine = new NavigationApiEngine();

    // 実行と検証
    expect(() => engine.navigate({ type: "MOVE", delta: -1 })).not.toThrow();
    expect(navigation.traverseTo).not.toHaveBeenCalled();
  });

  test("MOVE で範囲外の delta では何もしない", async ({ expect }) => {
    // 準備
    await using cleanup = new AsyncDisposableStack();
    const { navigation } = createMockNavigation({
      currentEntry: {
        id: VALID_ID,
        url: "https://example.com/",
        index: 5,
        addEventListener: () => {},
      },
      entries: () => [{ index: 5, key: "k5" }],
    });
    vi.stubGlobal("navigation", navigation);
    cleanup.defer(() => {
      vi.unstubAllGlobals();
    });
    const engine = new NavigationApiEngine();

    // 実行
    engine.navigate({ type: "MOVE", delta: 10 });

    // 検証
    expect(navigation.traverseTo).not.toHaveBeenCalled();
  });

  test("不正な navigate タイプでは UnreachableError を投げる", async ({ expect }) => {
    // 準備
    await using cleanup = new AsyncDisposableStack();
    const { navigation } = createMockNavigation({});
    vi.stubGlobal("navigation", navigation);
    cleanup.defer(() => {
      vi.unstubAllGlobals();
    });
    const engine = new NavigationApiEngine();

    // 実行と検証
    expect(() => engine.navigate({ type: "INVALID" } as any)).toThrow(UnreachableError);
  });

  test("不正な LINK 先タイプでは UnreachableError を投げる", async ({ expect }) => {
    // 準備
    await using cleanup = new AsyncDisposableStack();
    const { navigation } = createMockNavigation({});
    vi.stubGlobal("navigation", navigation);
    cleanup.defer(() => {
      vi.unstubAllGlobals();
    });
    const engine = new NavigationApiEngine();

    // 実行と検証
    expect(() =>
      engine.navigate({ type: "LINK", to: { type: "INVALID" } as any, history: "push" }),
    ).toThrow(UnreachableError);
  });
});

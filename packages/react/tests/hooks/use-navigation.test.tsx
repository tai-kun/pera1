import { RouterContextMissingError } from "@pera1/core";
import { NinjaPromise } from "ninja-promise";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, test, vi } from "vitest";

import type { RouterContextValue } from "../../src/contexts/router-context.js";
import RouterContext from "../../src/contexts/router-context.js";
import useNavigation from "../../src/hooks/use-navigation.js";

describe("useNavigation", () => {
  test("データがなければ idle を返す", async ({ expect }) => {
    // 準備
    await using cleanup = new AsyncDisposableStack();

    const entryId = "550e8400-e29b-41d4-a716-446655440000";
    const routerRef = {
      current: {
        currentEntry: { id: entryId, url: new URL("https://example.com/"), index: 0 },
        actionDataStore: new Map(),
        loaderDataStore: new Map(),
      },
    };
    const ctx = { routerRef, subscribe: () => () => {} };
    let state: string | undefined;

    function Comp() {
      state = useNavigation().state;

      return <span>{state}</span>;
    }

    const container = document.createElement("div");
    document.body.appendChild(container);
    cleanup.defer(() => {
      document.body.removeChild(container);
    });

    const root = createRoot(container);
    cleanup.defer(async () => {
      await act(async () => {
        root.unmount();
      });
    });

    // 実行
    await act(async () => {
      root.render(
        <RouterContext.Provider value={ctx as unknown as RouterContextValue}>
          <Comp />
        </RouterContext.Provider>,
      );
    });

    // 検証
    expect(state).toBe("idle");
    expect(container.textContent).toBe("idle");
  });

  test("ローダーが pending なら loading を返す", async ({ expect }) => {
    // 準備
    await using cleanup = new AsyncDisposableStack();

    function loader() {
      return "ok";
    }
    const pending = NinjaPromise.withResolvers<string>().promise;
    const entryId = "550e8400-e29b-41d4-a716-446655440000";
    const routerRef = {
      current: {
        currentEntry: { id: entryId, url: new URL("https://example.com/"), index: 0 },
        actionDataStore: new Map(),
        loaderDataStore: new Map([[entryId, new Map([[loader, pending]])]]),
      },
    };
    const ctx = { routerRef, subscribe: () => () => {} };
    let state: string | undefined;

    function Comp() {
      state = useNavigation().state;

      return <span>{state}</span>;
    }

    const container = document.createElement("div");
    document.body.appendChild(container);
    cleanup.defer(() => {
      document.body.removeChild(container);
    });

    const root = createRoot(container);
    cleanup.defer(async () => {
      await act(async () => {
        root.unmount();
      });
    });

    // 実行
    await act(async () => {
      root.render(
        <RouterContext.Provider value={ctx as unknown as RouterContextValue}>
          <Comp />
        </RouterContext.Provider>,
      );
    });

    // 検証
    expect(state).toBe("loading");
  });

  test("アクションが pending なら submitting を返す", async ({ expect }) => {
    // 準備
    await using cleanup = new AsyncDisposableStack();

    function action() {
      return "ok";
    }
    const pending = NinjaPromise.withResolvers<string>().promise;
    const entryId = "550e8400-e29b-41d4-a716-446655440000";
    const routerRef = {
      current: {
        currentEntry: { id: entryId, url: new URL("https://example.com/"), index: 0 },
        actionDataStore: new Map([[entryId, new Map([[action, pending]])]]),
        loaderDataStore: new Map(),
      },
    };
    const ctx = { routerRef, subscribe: () => () => {} };
    let state: string | undefined;

    function Comp() {
      state = useNavigation().state;

      return <span>{state}</span>;
    }

    const container = document.createElement("div");
    document.body.appendChild(container);
    cleanup.defer(() => {
      document.body.removeChild(container);
    });

    const root = createRoot(container);
    cleanup.defer(async () => {
      await act(async () => {
        root.unmount();
      });
    });

    // 実行
    await act(async () => {
      root.render(
        <RouterContext.Provider value={ctx as unknown as RouterContextValue}>
          <Comp />
        </RouterContext.Provider>,
      );
    });

    // 検証
    expect(state).toBe("submitting");
  });

  test("ローダーの完了後に idle へ戻る", async ({ expect }) => {
    // 準備
    await using cleanup = new AsyncDisposableStack();

    function loader() {
      return "ok";
    }
    const resolvers = NinjaPromise.withResolvers<string>();
    const promise = resolvers.promise;
    const entryId = "550e8400-e29b-41d4-a716-446655440000";
    const routerRef = {
      current: {
        currentEntry: { id: entryId, url: new URL("https://example.com/"), index: 0 },
        actionDataStore: new Map(),
        loaderDataStore: new Map([[entryId, new Map([[loader, promise]])]]),
      },
    };
    const ctx = { routerRef, subscribe: () => () => {} };

    function Comp() {
      const navigation = useNavigation();

      return <span>{navigation.state}</span>;
    }

    const container = document.createElement("div");
    document.body.appendChild(container);
    cleanup.defer(() => {
      document.body.removeChild(container);
    });

    const root = createRoot(container);
    cleanup.defer(async () => {
      await act(async () => {
        root.unmount();
      });
    });

    await act(async () => {
      root.render(
        <RouterContext.Provider value={ctx as unknown as RouterContextValue}>
          <Comp />
        </RouterContext.Provider>,
      );
    });
    expect(container.textContent).toBe("loading");

    // 実行 - ローダーを解決し、フックの自発的な再描画を待つ
    await act(async () => {
      resolvers.resolve("ok");
      await promise;
      // `Promise.allSettled` の後続タスクを流す
      await Promise.resolve();
      await new Promise((r) => setTimeout(r, 0));
    });

    // 検証
    expect(container.textContent).toBe("idle");
  });
});

describe("useNavigation の異常系", () => {
  test("RouterContext がなければエラーを投げる", async ({ expect }) => {
    // 準備
    await using cleanup = new AsyncDisposableStack();

    function Comp() {
      const navigation = useNavigation();

      return <span>{navigation.state}</span>;
    }

    const container = document.createElement("div");
    document.body.appendChild(container);
    cleanup.defer(() => {
      document.body.removeChild(container);
    });

    const root = createRoot(container);
    cleanup.defer(async () => {
      try {
        await act(async () => {
          root.unmount();
        });
      } catch {}
    });

    using _spy = vi.spyOn(console, "error").mockImplementation(() => {});

    // 実行と検証
    await expect(
      act(async () => {
        root.render(<Comp />);
      }),
    ).rejects.toThrow(RouterContextMissingError);
  });
});

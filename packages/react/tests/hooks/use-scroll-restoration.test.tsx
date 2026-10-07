import { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, test, vi } from "vitest";

import type { RouterContextValue } from "../../src/contexts/router-context.js";
import RouterContext from "../../src/contexts/router-context.js";
import useScrollRestoration from "../../src/hooks/use-scroll-restoration.js";

function createRouterCtx(entry: { id: string; url: URL; index: number }) {
  const routerRef = {
    current: {
      currentEntry: entry,
      actionDataStore: new Map(),
      loaderDataStore: new Map(),
    },
  };
  const listeners = new Set<() => void>();
  const ctx = {
    routerRef,
    subscribe: (cb: () => void) => {
      listeners.add(cb);

      return () => {
        listeners.delete(cb);
      };
    },
  };
  const notify = () => {
    for (const cb of listeners) {
      cb();
    }
  };
  const setEntry = (next: { id: string; url: URL; index: number }) => {
    (routerRef.current as { currentEntry: unknown }).currentEntry = next;
    notify();
  };

  return { ctx, setEntry };
}

describe("useScrollRestoration", () => {
  test("無効時は遷移しても scrollTo しない", async ({ expect }) => {
    // 準備
    await using cleanup = new AsyncDisposableStack();

    const { ctx, setEntry } = createRouterCtx({
      id: "id-1",
      url: new URL("https://example.com/a"),
      index: 0,
    });

    function Comp() {
      useScrollRestoration(false);

      return <span>ok</span>;
    }

    using scrollSpy = vi.spyOn(window, "scrollTo").mockImplementation(() => {});

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

    // 実行 - 別エントリーへ遷移
    await act(async () => {
      setEntry({ id: "id-2", url: new URL("https://example.com/b"), index: 1 });
    });

    // 検証
    expect(scrollSpy).not.toHaveBeenCalled();
  });

  test("有効時は遷移後に先頭へスクロールする", async ({ expect }) => {
    // 準備
    await using cleanup = new AsyncDisposableStack();

    const { ctx, setEntry } = createRouterCtx({
      id: "id-1",
      url: new URL("https://example.com/a"),
      index: 0,
    });

    function Comp() {
      useScrollRestoration(true);

      return <span>ok</span>;
    }

    using scrollSpy = vi.spyOn(window, "scrollTo").mockImplementation(() => {});

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
    expect(scrollSpy).not.toHaveBeenCalled();

    // 実行 - 別エントリーへ遷移
    await act(async () => {
      setEntry({ id: "id-2", url: new URL("https://example.com/b"), index: 1 });
    });

    // 検証
    expect(scrollSpy).toHaveBeenCalledWith({ top: 0, left: 0, behavior: "auto" });
  });

  test("ハッシュ付き遷移ではスクロールしない", async ({ expect }) => {
    // 準備
    await using cleanup = new AsyncDisposableStack();

    const { ctx, setEntry } = createRouterCtx({
      id: "id-1",
      url: new URL("https://example.com/a"),
      index: 0,
    });

    function Comp() {
      useScrollRestoration(true);

      return <span>ok</span>;
    }

    using scrollSpy = vi.spyOn(window, "scrollTo").mockImplementation(() => {});

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

    // 実行 - ハッシュ付きエントリーへ遷移
    await act(async () => {
      setEntry({ id: "id-2", url: new URL("https://example.com/b#section"), index: 1 });
    });

    // 検証
    expect(scrollSpy).not.toHaveBeenCalled();
  });
});

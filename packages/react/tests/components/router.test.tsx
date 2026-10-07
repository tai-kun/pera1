import type { HistoryEntryId } from "@pera1/core";
import type { HistoryEntryUrl } from "@pera1/core";
import { RoutePatternUtils } from "@pera1/core";
import type { IEngine } from "@pera1/core";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, test, vi } from "vitest";

import log from "../../src/_logger.js";
import Outlet from "../../src/components/outlet.jsx";
import Router from "../../src/components/router.jsx";
import useRouterContext from "../../src/hooks/use-router-context.js";

describe("Router", () => {
  test("マッチするルートがあるとき component を描画する", async ({ expect }) => {
    // 準備
    await using cleanup = new AsyncDisposableStack();

    function Comp() {
      return <span>hello</span>;
    }

    const engine: IEngine = {
      init: () => ({
        entry: {
          id: "550e8400-e29b-41d4-a716-446655440000" as unknown as HistoryEntryId,
          url: new URL("https://example.com/") as unknown as HistoryEntryUrl,
          index: 0,
        },
        routes: [
          {
            path: "/",
            index: false,
            utils: new RoutePatternUtils("/"),
            action: undefined,
            loader: undefined,
            component: Comp,
            shouldReload: () => false,
            params: {},
            urlPath: "/",
          },
        ],
      }),
      start: () => () => {},
      submit: () => {},
      navigate: () => {},
    };

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
      root.render(<Router engine={engine} routes={[{ path: "/", component: Comp }]} />);
    });

    // 検証
    expect(container.textContent).toBe("hello");
  });

  test("マッチしないとき null を返す", async ({ expect }) => {
    // 準備
    await using cleanup = new AsyncDisposableStack();

    const engine: IEngine = {
      init: () => null,
      start: () => () => {},
      submit: () => {},
      navigate: () => {},
    };

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
      root.render(<Router engine={engine} routes={[{ path: "/exists" }]} />);
    });

    // 検証
    expect(container.innerHTML).toBe("");
  });

  test("マッチしないとき notFoundComponent を描画する (006)", async ({ expect }) => {
    // 準備
    await using cleanup = new AsyncDisposableStack();

    function NotFound() {
      // `RouterContext` 配下で描画されるため、ルーターのフックが使える。
      const navigateType = useRouterContext((router) => typeof router.navigate);
      return <span>{`not-found:${navigateType}`}</span>;
    }

    const engine: IEngine = {
      init: () => null,
      start: () => () => {},
      submit: () => {},
      navigate: () => {},
    };

    const spy = vi.spyOn(log, "warn").mockImplementation(() => {});
    cleanup.defer(() => {
      spy.mockRestore();
    });

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
        <Router engine={engine} routes={[{ path: "/exists" }]} notFoundComponent={NotFound} />,
      );
    });

    // 検証
    expect(container.textContent).toBe("not-found:function");
    expect(spy).not.toHaveBeenCalled();
  });

  test("マッチがあるとき通常マッチが notFoundComponent より優先される (006)", async ({
    expect,
  }) => {
    // 準備: 明示的な `/*` 定義は通常マッチとして routes に含まれるため、notFoundComponent があっても使われないことを、一致ありの状態で確認します。
    await using cleanup = new AsyncDisposableStack();

    function Comp() {
      return <span>hello</span>;
    }

    function NotFound() {
      return <span>not-found</span>;
    }

    const engine: IEngine = {
      init: () => ({
        entry: {
          id: "550e8400-e29b-41d4-a716-446655440000" as unknown as HistoryEntryId,
          url: new URL("https://example.com/") as unknown as HistoryEntryUrl,
          index: 0,
        },
        routes: [
          {
            path: "/",
            index: false,
            utils: new RoutePatternUtils("/"),
            action: undefined,
            loader: undefined,
            component: Comp,
            shouldReload: () => false,
            params: {},
            urlPath: "/",
          },
        ],
      }),
      start: () => () => {},
      submit: () => {},
      navigate: () => {},
    };

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
        <Router
          engine={engine}
          routes={[{ path: "/", component: Comp }]}
          notFoundComponent={NotFound}
        />,
      );
    });

    // 検証
    expect(container.textContent).toBe("hello");
  });

  test("マッチせず notFoundComponent もないとき開発モードで警告する (006)", async ({ expect }) => {
    // 準備
    await using cleanup = new AsyncDisposableStack();

    const engine: IEngine = {
      init: () => null,
      start: () => () => {},
      submit: () => {},
      navigate: () => {},
    };

    const spy = vi.spyOn(log, "warn").mockImplementation(() => {});
    cleanup.defer(() => {
      spy.mockRestore();
    });

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
      root.render(<Router engine={engine} routes={[{ path: "/exists" }]} />);
    });

    // 検証: 従来通り null 描画 + 開発警告
    expect(container.innerHTML).toBe("");
    expect(spy).toHaveBeenCalledTimes(1);
    expect(String(spy.mock.calls[0]?.[0])).toContain("notFoundComponent");
  });

  test("ネストしたルートで outlet が機能する", async ({ expect }) => {
    // 準備
    await using cleanup = new AsyncDisposableStack();

    function Parent() {
      return (
        <div>
          <span>parent</span>
          <Outlet />
        </div>
      );
    }

    function Child() {
      return <span>child</span>;
    }

    const parentRoute: any = {
      path: "/",
      index: false,
      utils: new RoutePatternUtils("/"),
      action: undefined,
      loader: undefined,
      component: Parent,
      shouldReload: () => false,
      params: {},
      urlPath: "/",
    };
    const childRoute: any = {
      path: "/child",
      index: false,
      utils: new RoutePatternUtils("/child"),
      action: undefined,
      loader: undefined,
      component: Child,
      shouldReload: () => false,
      params: {},
      urlPath: "/child",
    };
    const engine: IEngine = {
      init: () => ({
        entry: {
          id: "550e8400-e29b-41d4-a716-446655440000" as unknown as HistoryEntryId,
          url: new URL("https://example.com/child") as unknown as HistoryEntryUrl,
          index: 0,
        },
        routes: [childRoute, parentRoute],
      }),
      start: () => () => {},
      submit: () => {},
      navigate: () => {},
    };

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
      root.render(<Router engine={engine} routes={[{ path: "/" }, { path: "/child" }]} />);
    });

    // 検証
    expect(container.textContent).toContain("parent");
    expect(container.textContent).toContain("child");
  });

  test("遷移後に routerRef が最新のエントリーを指す", async ({ expect }) => {
    // 準備
    await using cleanup = new AsyncDisposableStack();

    const entryA = {
      id: "550e8400-e29b-41d4-a716-446655440000" as unknown as HistoryEntryId,
      url: new URL("https://example.com/a") as unknown as HistoryEntryUrl,
      index: 0,
    };
    const entryB = {
      id: "660e8400-e29b-41d4-a716-446655440001" as unknown as HistoryEntryId,
      url: new URL("https://example.com/b") as unknown as HistoryEntryUrl,
      index: 1,
    };

    function Probe() {
      const id = useRouterContext((router) => router.currentEntry.id);
      return <span>{id}</span>;
    }

    function PageA() {
      return <Probe />;
    }

    function PageB() {
      return <Probe />;
    }

    const routeA: any = {
      path: "/a",
      index: true,
      utils: new RoutePatternUtils("/a"),
      action: undefined,
      loader: undefined,
      component: PageA,
      shouldReload: () => false,
      params: {},
      urlPath: "/a",
    };
    const routeB: any = {
      path: "/b",
      index: true,
      utils: new RoutePatternUtils("/b"),
      action: undefined,
      loader: undefined,
      component: PageB,
      shouldReload: () => false,
      params: {},
      urlPath: "/b",
    };

    let update!: IEngine.StartArgs["update"];
    const engine: IEngine = {
      init: () => ({ entry: entryA, routes: [routeA] }),
      start: (args) => {
        update = args.update;
        return () => {};
      },
      submit: () => {},
      navigate: () => {},
    };

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
      root.render(<Router engine={engine} routes={[{ path: "/a" }, { path: "/b" }]} />);
    });
    expect(container.textContent).toBe(entryA.id as string);

    // 実行 - エンジンからの遷移確定を模倣する
    await act(async () => {
      update({ entry: entryB, routes: [routeB] } as any);
    });

    // 検証 - useRouterContext が古いエントリーを参照し続けてはならない
    expect(container.textContent).toBe(entryB.id as string);
  });
});

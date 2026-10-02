import type { HistoryEntryId } from "@pera1/core";
import type { HistoryEntryUrl } from "@pera1/core";
import { RoutePatternUtils } from "@pera1/core";
import type { IEngine } from "@pera1/core";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, test } from "vitest";

import Outlet from "../../src/components/outlet.jsx";
import Router from "../../src/components/router.jsx";

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
});

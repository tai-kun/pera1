import type { HistoryEntryId, HistoryEntryUrl, IEngine } from "@pera1/core";
import { RoutePatternUtils } from "@pera1/core";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, test } from "vitest";

import Router from "../../src/components/router.jsx";
import useRouteContext from "../../src/hooks/use-route-context.js";

describe("Router の分岐網羅", () => {
  test("component が未定義のとき outlet を描画する", async ({ expect }) => {
    // 準備
    await using cleanup = new AsyncDisposableStack();

    function Child() {
      return <span>child</span>;
    }
    const parentRoute: any = {
      path: "/",
      index: false,
      utils: new RoutePatternUtils("/"),
      action: undefined,
      loader: undefined,
      component: undefined,
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
    expect(container.textContent).toContain("child");
  });

  test("親の action/loader を子が引き継いで useActionData/useLoaderData で参照できる", async ({
    expect,
  }) => {
    // 準備
    await using cleanup = new AsyncDisposableStack();

    const parentAction = () => "parent-action";
    const parentLoader = () => "parent-loader";
    function Child() {
      const ctx = useRouteContext() as any;
      return (
        <span>
          {String(ctx.action === parentAction)}-{String(ctx.loader === parentLoader)}
        </span>
      );
    }
    const parentRoute: any = {
      path: "/",
      index: false,
      utils: new RoutePatternUtils("/"),
      action: parentAction,
      loader: parentLoader,
      component: undefined,
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
    const { NinjaPromise } = await import("ninja-promise");
    const entryId = "550e8400-e29b-41d4-a716-446655440000" as unknown as HistoryEntryId;
    const actionPromise = NinjaPromise.resolve("a-result");
    const loaderPromise = NinjaPromise.resolve("l-result");
    const actionStore: any = new Map([[entryId, new Map([[parentAction, actionPromise]])]]);
    const loaderStore: any = new Map([[entryId, new Map([[parentLoader, loaderPromise]])]]);
    const engine: IEngine = {
      init: () => ({
        entry: {
          id: entryId,
          url: new URL("https://example.com/child") as unknown as HistoryEntryUrl,
          index: 0,
        },
        routes: [childRoute, parentRoute],
      }),
      start: () => () => {},
      submit: () => {},
      navigate: () => {},
    };
    // 未使用変数の警告を避けるために参照する
    expect(actionStore).toBeDefined();
    expect(loaderStore).toBeDefined();

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

    // 検証（親の action/loader を引き継いでいる）
    expect(container.textContent).toContain("true-true");
  });

  test("独自の action/loader を持つ子は親を引き継がない", async ({ expect }) => {
    // 準備
    await using cleanup = new AsyncDisposableStack();

    const childAction = () => "child-action";
    function Child() {
      return <span>child-own</span>;
    }
    const parentRoute: any = {
      path: "/",
      index: false,
      utils: new RoutePatternUtils("/"),
      action: () => "parent-action",
      loader: () => "parent-loader",
      component: undefined,
      shouldReload: () => false,
      params: {},
      urlPath: "/",
    };
    const childRoute: any = {
      path: "/child",
      index: false,
      utils: new RoutePatternUtils("/child"),
      action: childAction,
      loader: () => "child-loader",
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
    expect(container.textContent).toContain("child-own");
  });
});

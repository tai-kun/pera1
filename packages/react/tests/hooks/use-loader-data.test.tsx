import { LoaderDataNotFoundError } from "@pera1/core";
import type { HistoryEntryId } from "@pera1/core";
/* oxlint-disable typescript-eslint/no-base-to-string */
import { NinjaPromise } from "ninja-promise";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, test, vi } from "vitest";

import type { RouteContextValue } from "../../src/contexts/route-context.js";
import RouteContext from "../../src/contexts/route-context.js";
import type { RouterContextValue } from "../../src/contexts/router-context.js";
import RouterContext from "../../src/contexts/router-context.js";
import useLoaderData from "../../src/hooks/use-loader-data.js";

describe("useLoaderData", () => {
  test("loader に対応するデータを返す", async ({ expect }) => {
    // 準備
    await using cleanup = new AsyncDisposableStack();

    const loader = () => "data";
    const promise = NinjaPromise.resolve({ hello: "world" });
    const entryId = "550e8400-e29b-41d4-a716-446655440000" as unknown as HistoryEntryId;
    const loaderMap = new Map([[loader, promise]]);
    const store = new Map([[entryId, loaderMap]]);
    const routerRef = { current: { currentEntry: { id: entryId }, loaderDataStore: store } };
    const routerCtx = { routerRef, subscribe: () => () => {} };
    const routeValue = { loader, outlet: null };

    function Comp() {
      const data = useLoaderData();

      return <span>{String(data === promise)}</span>;
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
        <RouterContext.Provider value={routerCtx as unknown as RouterContextValue}>
          <RouteContext.Provider value={routeValue as unknown as RouteContextValue}>
            <Comp />
          </RouteContext.Provider>
        </RouterContext.Provider>,
      );
    });

    // 検証
    expect(container.textContent).toBe("true");
  });

  test("データが見つからないときエラーを投げる", async ({ expect }) => {
    // 準備
    await using cleanup = new AsyncDisposableStack();

    const loader = () => "data";
    const routerRef = {
      current: { currentEntry: { id: "other" }, loaderDataStore: new Map() },
    };
    const routerCtx = { routerRef, subscribe: () => () => {} };
    const routeValue = { loader, outlet: null };

    function Comp() {
      const data = useLoaderData();

      return <span>{String(data)}</span>;
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
        root.render(
          <RouterContext.Provider value={routerCtx as unknown as RouterContextValue}>
            <RouteContext.Provider value={routeValue as unknown as RouteContextValue}>
              <Comp />
            </RouteContext.Provider>
          </RouterContext.Provider>,
        );
      }),
    ).rejects.toThrow(LoaderDataNotFoundError);
  });
});

describe("useLoaderData の匿名ローダー", () => {
  test("名前のないローダーは anonymous と表示する", async ({ expect }) => {
    // 準備
    await using cleanup = new AsyncDisposableStack();

    const loader = (() => "data") as () => string;
    Object.defineProperty(loader, "name", { value: "" });
    const routerRef = {
      current: { currentEntry: { id: "other" }, loaderDataStore: new Map() },
    };
    const routerCtx = { routerRef, subscribe: () => () => {} };
    const routeValue = { loader, outlet: null };

    function Comp() {
      const data = useLoaderData();

      return <span>{String(data)}</span>;
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
        root.render(
          <RouterContext.Provider value={routerCtx as unknown as RouterContextValue}>
            <RouteContext.Provider value={routeValue as unknown as RouteContextValue}>
              <Comp />
            </RouteContext.Provider>
          </RouterContext.Provider>,
        );
      }),
    ).rejects.toThrow("anonymous");
  });
});

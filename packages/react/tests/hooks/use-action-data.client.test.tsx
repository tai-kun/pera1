import type { HistoryEntryId } from "@pera1/core";
/* oxlint-disable typescript-eslint/no-base-to-string */
import { NinjaPromise } from "ninja-promise";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, test } from "vitest";

import type { RouteContextValue } from "../../src/contexts/route-context.js";
import RouteContext from "../../src/contexts/route-context.js";
import type { RouterContextValue } from "../../src/contexts/router-context.js";
import RouterContext from "../../src/contexts/router-context.js";
import useActionData from "../../src/hooks/use-action-data.js";

describe("useActionData", () => {
  test("action に対応するデータを返す", async ({ expect }) => {
    // 準備
    await using cleanup = new AsyncDisposableStack();

    const action = () => "result";
    const promise = NinjaPromise.resolve("my-data");
    const entryId = "550e8400-e29b-41d4-a716-446655440000" as unknown as HistoryEntryId;
    const actionMap = new Map([[action, promise]]);
    const store = new Map([[entryId, actionMap]]);
    const routerRef = {
      current: {
        currentEntry: {
          id: entryId,
        },
        actionDataStore: store,
      },
    };
    const routerCtx: any = {
      routerRef,
      subscribe: () => () => {},
    };
    const routeValue: any = {
      action,
      outlet: null,
    };

    function Comp() {
      const data = useActionData();
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

  test("未実行の action では undefined を返す", async ({ expect }) => {
    // 準備
    await using cleanup = new AsyncDisposableStack();

    const action = () => "result";
    const routerRef = {
      current: {
        currentEntry: {
          id: "other-id",
        },
        actionDataStore: new Map(),
      },
    };
    const routerCtx = {
      routerRef,
      subscribe: () => () => {},
    };
    const routeValue = {
      action,
      outlet: null,
    };

    function Comp() {
      const data = useActionData();
      return <span>{String(data)}</span>;
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
    expect(container.textContent).toBe("undefined");
  });
});

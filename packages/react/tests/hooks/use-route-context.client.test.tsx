import { RouteContextMissingError } from "@pera1/core";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, test } from "vitest";

import RouteContext from "../../src/contexts/route-context.js";
import useRouteContext from "../../src/hooks/use-route-context.js";

describe("useRouteContext", () => {
  test("RouteContext 配下では値を返す", async ({ expect }) => {
    // 準備
    await using cleanup = new AsyncDisposableStack();

    const value: any = { path: "/test", params: { id: "1" }, outlet: null };

    function Comp() {
      const ctx = useRouteContext();
      return <span>{ctx.path}</span>;
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
        <RouteContext.Provider value={value}>
          <Comp />
        </RouteContext.Provider>,
      );
    });

    // 検証
    expect(container.textContent).toBe("/test");
  });

  test("RouteContext なしではエラーを投げる", async ({ expect }) => {
    // 準備
    await using cleanup = new AsyncDisposableStack();

    function Comp() {
      const ctx = useRouteContext();
      return <span>{ctx.path}</span>;
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

    // 実行と検証
    await expect(
      act(async () => {
        root.render(<Comp />);
      }),
    ).rejects.toThrow(RouteContextMissingError);
  });
});

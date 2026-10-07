import { RouteContextMissingError } from "@pera1/core";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, test, vi } from "vitest";

import Outlet from "../../src/components/outlet.jsx";
import RouteContext from "../../src/contexts/route-context.js";

describe("Outlet", () => {
  test("子があるとき outlet を描画する", async ({ expect }) => {
    // 準備
    await using cleanup = new AsyncDisposableStack();

    const child = <span>child-content</span>;
    const value: any = {
      outlet: child,
      path: "/parent",
      params: {},
      urlPath: "/parent",
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
        <RouteContext.Provider value={value}>
          <Outlet />
        </RouteContext.Provider>,
      );
    });

    // 検証
    expect(container.textContent).toBe("child-content");
  });

  test("子がないとき null を返す", async ({ expect }) => {
    // 準備
    await using cleanup = new AsyncDisposableStack();

    const value: any = {
      outlet: null,
      path: "/leaf",
      params: {},
      urlPath: "/leaf",
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
        <RouteContext.Provider value={value}>
          <Outlet />
        </RouteContext.Provider>,
      );
    });

    // 検証
    expect(container.innerHTML).toBe("");
  });

  test("RouteContext なしではエラーを投げる", async ({ expect }) => {
    // 準備
    await using cleanup = new AsyncDisposableStack();

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
    let error: unknown;
    try {
      await act(async () => {
        root.render(<Outlet />);
      });
    } catch (ex) {
      error = ex;
    }
    expect(error).toBeInstanceOf(RouteContextMissingError);
  });
});

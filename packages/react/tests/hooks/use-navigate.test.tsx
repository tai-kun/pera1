/* oxlint-disable vitest/require-mock-type-parameters */
import { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, test, vi } from "vitest";

import type { RouterContextValue } from "../../src/contexts/router-context.js";
import RouterContext from "../../src/contexts/router-context.js";
import useNavigate from "../../src/hooks/use-navigate.js";

describe("useNavigate", () => {
  test("文字列で navigate を呼ぶと STATIC LINK になる", async ({ expect }) => {
    // 準備
    await using cleanup = new AsyncDisposableStack();

    const navigate = vi.fn();
    const routerRef = { current: { navigate } };
    const ctx = { routerRef, subscribe: () => () => {} };
    let nav: ReturnType<typeof useNavigate> | undefined;

    function Comp() {
      nav = useNavigate();

      return <span>ok</span>;
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
    nav!("/users");

    // 検証
    expect(navigate).toHaveBeenCalledWith({
      type: "LINK",
      to: { type: "STATIC", path: "/users" },
      history: "push",
    });
  });

  test("数値で呼ぶと MOVE になる", async ({ expect }) => {
    // 準備
    await using cleanup = new AsyncDisposableStack();

    const navigate = vi.fn();
    const routerRef = { current: { navigate } };
    const ctx = { routerRef, subscribe: () => () => {} };
    let nav: any;

    function Comp() {
      nav = useNavigate();

      return <span>ok</span>;
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
    nav(-1);

    // 検証
    expect(navigate).toHaveBeenCalledWith({ type: "MOVE", delta: -1 });
  });
});

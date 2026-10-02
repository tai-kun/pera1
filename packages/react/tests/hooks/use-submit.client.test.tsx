/* oxlint-disable vitest/require-mock-type-parameters */
import { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, test, vi } from "vitest";

import type { RouteContextValue } from "../../src/contexts/route-context.js";
import RouteContext from "../../src/contexts/route-context.js";
import type { RouterContextValue } from "../../src/contexts/router-context.js";
import RouterContext from "../../src/contexts/router-context.js";
import useSubmit from "../../src/hooks/use-submit.js";

describe("useSubmit", () => {
  test("FormData で FORM_DATA を送信する", async ({ expect }) => {
    // 準備
    await using cleanup = new AsyncDisposableStack();

    const submit = vi.fn();
    const routerRef = { current: { submit } };
    const routerCtx = { routerRef, subscribe: () => () => {} };
    const routeValue = { urlPath: "/current", outlet: null };
    const fd = new FormData();
    fd.set("a", "1");
    let doSubmit: ReturnType<typeof useSubmit> | undefined;

    function Comp() {
      doSubmit = useSubmit();
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
        <RouterContext.Provider value={routerCtx as unknown as RouterContextValue}>
          <RouteContext.Provider value={routeValue as unknown as RouteContextValue}>
            <Comp />
          </RouteContext.Provider>
        </RouterContext.Provider>,
      );
    });
    doSubmit!(fd);

    // 検証
    expect(submit).toHaveBeenCalledWith({ type: "FORM_DATA", target: fd, action: "/current" });
  });

  test("action オプションで上書きできる", async ({ expect }) => {
    // 準備
    await using cleanup = new AsyncDisposableStack();

    const submit = vi.fn();
    const routerRef = { current: { submit } };
    const routerCtx = { routerRef, subscribe: () => () => {} };
    const routeValue = { urlPath: "/current", outlet: null };
    const fd = new FormData();
    let doSubmit: any;

    function Comp() {
      doSubmit = useSubmit();
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
        <RouterContext.Provider value={routerCtx as unknown as RouterContextValue}>
          <RouteContext.Provider value={routeValue as unknown as RouteContextValue}>
            <Comp />
          </RouteContext.Provider>
        </RouterContext.Provider>,
      );
    });
    doSubmit(fd, { action: "/other" });

    // 検証
    expect(submit).toHaveBeenCalledWith(expect.objectContaining({ action: "/other" }));
  });

  test("URLSearchParams で URL_SEARCH_PARAMS を送信する", async ({ expect }) => {
    // 準備
    await using cleanup = new AsyncDisposableStack();

    const submit = vi.fn();
    const routerRef = { current: { submit } };
    const routerCtx = { routerRef, subscribe: () => () => {} };
    const routeValue = { urlPath: "/current", outlet: null };
    const params = new URLSearchParams("x=1");
    let doSubmit: any;

    function Comp() {
      doSubmit = useSubmit();
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
        <RouterContext.Provider value={routerCtx as unknown as RouterContextValue}>
          <RouteContext.Provider value={routeValue as unknown as RouteContextValue}>
            <Comp />
          </RouteContext.Provider>
        </RouterContext.Provider>,
      );
    });
    doSubmit(params);

    // 検証
    expect(submit).toHaveBeenCalledWith({
      type: "URL_SEARCH_PARAMS",
      target: params,
      action: "/current",
      history: "push",
    });
  });

  test("replace で history が replace になる", async ({ expect }) => {
    // 準備
    await using cleanup = new AsyncDisposableStack();

    const submit = vi.fn();
    const routerRef = { current: { submit } };
    const routerCtx = { routerRef, subscribe: () => () => {} };
    const routeValue = { urlPath: "/current", outlet: null };
    const params = new URLSearchParams();
    let doSubmit: any;

    function Comp() {
      doSubmit = useSubmit();
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
        <RouterContext.Provider value={routerCtx as unknown as RouterContextValue}>
          <RouteContext.Provider value={routeValue as unknown as RouteContextValue}>
            <Comp />
          </RouteContext.Provider>
        </RouterContext.Provider>,
      );
    });
    doSubmit(params, { replace: true });

    // 検証
    expect(submit).toHaveBeenCalledWith(expect.objectContaining({ history: "replace" }));
  });
});

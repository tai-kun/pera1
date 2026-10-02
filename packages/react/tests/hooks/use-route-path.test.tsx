import { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, test } from "vitest";

import type { RouterContextValue } from "../../src/contexts/router-context.js";
import RouterContext from "../../src/contexts/router-context.js";
import useRoutePath from "../../src/hooks/use-route-path.js";

describe("useRoutePath", () => {
  test("現在の URL から RoutePath を返す", async ({ expect }) => {
    // 準備
    await using cleanup = new AsyncDisposableStack();

    const url = new URL("https://example.com/users/1?foo=bar#sec");
    const routerRef = { current: { currentEntry: { url } } };
    const ctx = { routerRef, subscribe: () => () => {} };

    function Comp() {
      const path = useRoutePath();
      return <span>{path.toString()}</span>;
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

    // 検証
    expect(container.textContent).toBe("/users/1?foo=bar#sec");
  });
});

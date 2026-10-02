import { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, test } from "vitest";

import type { RouteContextValue } from "../../src/contexts/route-context.js";
import RouteContext from "../../src/contexts/route-context.js";
import useParams from "../../src/hooks/use-params.js";

describe("useParams", () => {
  test("現在の params を返す", async ({ expect }) => {
    // 準備
    await using cleanup = new AsyncDisposableStack();

    const value = { params: { id: "42", slug: "hello" }, outlet: null };

    function Comp() {
      const params = useParams();
      return <span>{JSON.stringify(params)}</span>;
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
        <RouteContext.Provider value={value as unknown as RouteContextValue}>
          <Comp />
        </RouteContext.Provider>,
      );
    });

    // 検証
    expect(container.textContent).toBe('{"id":"42","slug":"hello"}');
  });
});

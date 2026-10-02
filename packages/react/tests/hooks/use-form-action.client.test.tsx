import { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, test } from "vitest";

import RouteContext from "../../src/contexts/route-context.js";
import useFormAction from "../../src/hooks/use-form-action.js";

describe("useFormAction", () => {
  test("現在の urlPath を返す", async ({ expect }) => {
    // 準備
    await using cleanup = new AsyncDisposableStack();

    const value: any = {
      urlPath: "/users/42",
      outlet: null,
    };

    function Comp() {
      const action = useFormAction();
      return <span>{action}</span>;
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
    expect(container.textContent).toBe("/users/42");
  });
});

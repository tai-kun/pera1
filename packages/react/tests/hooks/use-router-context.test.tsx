import { RouterContextMissingError } from "@pera1/core";
/* oxlint-disable typescript-eslint/no-base-to-string */
import { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, test } from "vitest";

import RouterContext from "../../src/contexts/router-context.js";
import useRouterContext from "../../src/hooks/use-router-context.js";

describe("useRouterContext", () => {
  test("RouterContext 配下では selector の結果を返す", async ({ expect }) => {
    // 準備
    await using cleanup = new AsyncDisposableStack();

    const routerRef: any = {
      current: { currentEntry: { url: new URL("https://example.com/") } },
    };
    const ctx: any = { routerRef, subscribe: () => () => {} };

    function Comp() {
      const url = useRouterContext((r) => r.currentEntry.url);

      return <span>{url.href}</span>;
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
        <RouterContext.Provider value={ctx}>
          <Comp />
        </RouterContext.Provider>,
      );
    });

    // 検証
    expect(container.textContent).toBe("https://example.com/");
  });

  test("RouterContext なしではエラーを投げる", async ({ expect }) => {
    // 準備
    await using cleanup = new AsyncDisposableStack();

    function Comp() {
      const v = useRouterContext((r) => r);

      return <span>{String(v)}</span>;
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
    ).rejects.toThrow(RouterContextMissingError);
  });
});

import { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, test, vi } from "vitest";

import BrowserRouter from "../../src/components/browser-router.jsx";

describe("BrowserRouter", () => {
  test("routes を Router に委譲して描画する", async ({ expect }) => {
    // 準備 - Navigation API をモックして Router が初期化できるようにする
    await using cleanup = new AsyncDisposableStack();

    vi.stubGlobal("navigation", {
      currentEntry: {
        id: "550e8400-e29b-41d4-a716-446655440000",
        url: "https://example.com/",
        index: 0,
        addEventListener: () => {},
      },
      entries: () => [],
      addEventListener: () => {},
      navigate: () => {},
      traverseTo: () => {},
    });
    cleanup.defer(() => {
      vi.unstubAllGlobals();
    });

    function Home() {
      return <span>home</span>;
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
      root.render(<BrowserRouter routes={[{ path: "/", component: Home }]} />);
    });

    // 検証
    expect(container.textContent).toBe("home");
  });

  test("未マッチ時に notFoundComponent を透過して描画する (006)", async ({ expect }) => {
    // 準備 - どのルートにも一致しない URL で Navigation API をモックする
    await using cleanup = new AsyncDisposableStack();

    vi.stubGlobal("navigation", {
      currentEntry: {
        id: "550e8400-e29b-41d4-a716-446655440000",
        url: "https://example.com/no-such-page",
        index: 0,
        addEventListener: () => {},
      },
      entries: () => [],
      addEventListener: () => {},
      navigate: () => {},
      traverseTo: () => {},
    });
    cleanup.defer(() => {
      vi.unstubAllGlobals();
    });

    function Home() {
      return <span>home</span>;
    }

    function NotFound() {
      return <span>not-found</span>;
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
      // `index: true` は完全一致のみのため `/no-such-page` にはマッチしない。
      // (`index` なしの `/` は前方一致でマッチしてしまうため使わない。)
      root.render(
        <BrowserRouter
          routes={[{ path: "/", index: true, component: Home }]}
          notFoundComponent={NotFound}
        />,
      );
    });

    // 検証
    expect(container.textContent).toBe("not-found");
  });
});

import * as React from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, test } from "vitest";

import useSingleton from "../../src/hooks/_use-singleton.js";

describe("_use-singleton", () => {
  test("初回で生成された値が再レンダリングでも保持される", async ({ expect }) => {
    // 準備
    await using cleanup = new AsyncDisposableStack();

    let callCount = 0;
    const factory = () => {
      callCount++;
      return { id: 1 };
    };

    function TestComponent() {
      const value = useSingleton(factory);
      return <span>{value.id}</span>;
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
      root.render(<TestComponent />);
    });
    expect(container.textContent).toBe("1");
    expect(callCount).toBe(1);

    // 検証 - 再レンダリングしてもファクトリーは呼ばれない
    await act(async () => {
      root.render(<TestComponent />);
    });
    expect(callCount).toBe(1);
  });

  test("StrictMode でもファクトリーは1回だけ呼ばれる", async ({ expect }) => {
    // 準備
    await using cleanup = new AsyncDisposableStack();

    let count = 0;
    function Comp() {
      const v = useSingleton(() => {
        count++;
        return { x: 1 };
      });
      return <span>{v.x}</span>;
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
        <React.StrictMode>
          <Comp />
        </React.StrictMode>,
      );
    });

    // 検証
    expect(count).toBe(1);
  });
});

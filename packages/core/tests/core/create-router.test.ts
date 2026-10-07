import { describe, test } from "vitest";

import createRouter from "../../src/core/create-router.js";
import type { IEngine } from "../../src/engines/engine.types.js";

function createStubEngine(): IEngine & { calls: string[] } {
  const calls: string[] = [];
  const engine = {
    calls,
    init: () => null,
    start: () => {
      calls.push("start");

      return () => {
        calls.push("stop");
      };
    },
    submit: () => {
      calls.push("submit");
    },
    navigate: () => {
      calls.push("navigate");
    },
  };

  return engine as unknown as IEngine & { calls: string[] };
}

describe("createRouter", () => {
  test("init が null のとき getRoutes は undefined になる", ({ expect }) => {
    // 準備
    const engine = createStubEngine();

    // 実行
    const controller = createRouter({ engine, routes: [] });

    // 検証
    expect(controller.getRoutes()).toBeUndefined();
    expect(controller.getSnapshot().currentEntry).toBeUndefined();
  });

  test("submit と navigate がエンジンに委譲される", ({ expect }) => {
    // 準備
    const engine = createStubEngine();
    const controller = createRouter({ engine, routes: [] });
    const snapshot = controller.getSnapshot();

    // 実行
    snapshot.submit({ type: "FORM_DATA", target: new FormData(), action: "/" });
    snapshot.navigate({ type: "MOVE", delta: -1 });

    // 検証
    expect(engine.calls).toContain("submit");
    expect(engine.calls).toContain("navigate");
  });

  test("同一スナップショット参照が維持される", ({ expect }) => {
    // 準備
    const engine = createStubEngine();
    const controller = createRouter({ engine, routes: [] });

    // 実行
    const a = controller.getSnapshot();
    const b = controller.getSnapshot();

    // 検証
    expect(a).toBe(b);
  });
});

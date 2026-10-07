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

  test("subscribe と start/stop が連動する", ({ expect }) => {
    // 準備
    const engine = createStubEngine();
    const controller = createRouter({ engine, routes: [] });
    let notified = 0;

    // 実行
    const unsubscribe = controller.subscribe(() => {
      notified += 1;
    });
    const stop = controller.start();

    // 検証
    expect(engine.calls).toContain("start");
    unsubscribe();
    stop();
    expect(engine.calls).toContain("stop");
    expect(notified).toBe(0);
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

  test("update の 3 値分岐を区別する (006): 確定・未マッチ・再描画", ({ expect }) => {
    // 準備: update 関数を回収できるスタブエンジン
    let update!: IEngine.StartArgs["update"];
    const engine = createStubEngine();
    const start = engine.start.bind(engine);
    engine.start = ((args: IEngine.StartArgs) => {
      update = args.update;
      return (start as (args: IEngine.StartArgs) => () => void)(args);
    }) as IEngine["start"];

    const routeA = { path: "/a" };
    const entryA = { id: "a", url: new URL("https://example.com/a") };
    const entryB = { id: "b", url: new URL("https://example.com/b") };
    const controller = createRouter({ engine, routes: [] });
    const stop = controller.start();

    try {
      // 実行 1: マッチありの確定状態
      update({ entry: entryA, routes: [routeA] } as never);
      const matched = controller.getRoutes();

      // 実行 2: 未マッチ (404 相当) へのリセット
      update(null);
      const unmatched = controller.getRoutes();

      // 実行 3: 引数なしの再描画 (状態維持)
      update({ entry: entryB, routes: [routeA] } as never);
      const beforeRerender = controller.getRoutes();
      update();
      const afterRerender = controller.getRoutes();

      // 検証
      expect(matched).toHaveLength(1);
      expect(unmatched).toBeUndefined();
      expect(afterRerender).toBe(beforeRerender);
    } finally {
      stop();
    }
  });
});

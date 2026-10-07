import { describe, test, vi } from "vitest";

import createRouter from "../../src/core/create-router.js";
import type { IEngine } from "../../src/engines/engine.types.js";

describe("createRouter の初期状態", () => {
  test("init が entry と routes を返すときスナップショットに反映される", ({ expect }) => {
    // 準備
    const entry = { id: "id-1", url: new URL("https://example.com/"), index: 0 };
    const routes: any[] = [{ path: "/" }];
    const engine = {
      init: () => ({ entry, routes }),
      start: () => {},
      submit: () => {},
      navigate: () => {},
    } as unknown as IEngine;

    // 実行
    const controller = createRouter({ engine, routes: [] });

    // 検証
    expect(controller.getRoutes()).toBe(routes);
    expect(controller.getSnapshot().currentEntry).toBe(entry);
  });

  test("init で getSignal が呼ばれると AbortController が生成される", ({ expect }) => {
    // 準備
    let capturedSignal: AbortSignal | undefined;
    const engine = {
      init: (args: IEngine.InitArgs) => {
        capturedSignal = args.getSignal();

        return null;
      },
      start: () => {},
      submit: () => {},
      navigate: () => {},
    } as unknown as IEngine;

    // 実行
    createRouter({ engine, routes: [] });

    // 検証
    expect(capturedSignal).toBeInstanceOf(AbortSignal);
  });

  test("getSignal を 2 回呼ぶと同一シグナルを返す（シングルトン）", ({ expect }) => {
    // 準備
    const signals: AbortSignal[] = [];
    const engine = {
      init: (args: IEngine.InitArgs) => {
        signals.push(args.getSignal());
        signals.push(args.getSignal());

        return null;
      },
      start: () => {},
      submit: () => {},
      navigate: () => {},
    } as unknown as IEngine;

    // 実行
    createRouter({ engine, routes: [] });

    // 検証
    expect(signals[0]).toBe(signals[1]);
  });
});

describe("createRouter の update 通知", () => {
  test("update() 引数なしでも購読者に通知する", ({ expect }) => {
    // 準備
    let capturedUpdate!: IEngine.StartArgs["update"];
    const engine = {
      init: () => null,
      start: (args: IEngine.StartArgs) => {
        capturedUpdate = args.update;
      },
      submit: () => {},
      navigate: () => {},
    } as unknown as IEngine;
    const controller = createRouter({ engine, routes: [] });
    controller.start();
    let notified = 0;
    controller.subscribe(() => {
      notified += 1;
    });

    // 実行
    capturedUpdate();

    // 検証
    expect(notified).toBe(1);
    expect(controller.getRoutes()).toBeUndefined();
  });

  test("update(null) で routes が undefined になる", ({ expect }) => {
    // 準備
    let capturedUpdate!: IEngine.StartArgs["update"];
    const entry: any = { id: "id-1", url: new URL("https://example.com/"), index: 0 };
    const routes: any[] = [{ path: "/" }];
    const engine = {
      init: () => ({ entry, routes }),
      start: (args: IEngine.StartArgs) => {
        capturedUpdate = args.update;
      },
      submit: () => {},
      navigate: () => {},
    } as unknown as IEngine;
    const controller = createRouter({ engine, routes: [] });
    controller.start();
    let notified = 0;
    controller.subscribe(() => {
      notified += 1;
    });

    // 実行
    capturedUpdate(null);

    // 検証
    expect(controller.getRoutes()).toBeUndefined();
    expect(controller.getSnapshot().currentEntry).toBe(entry);
    expect(notified).toBe(1);
  });

  test("update({entry, routes}) で両方が更新される", ({ expect }) => {
    // 準備
    let capturedUpdate!: IEngine.StartArgs["update"];
    const engine = {
      init: () => null,
      start: (args: IEngine.StartArgs) => {
        capturedUpdate = args.update;
      },
      submit: () => {},
      navigate: () => {},
    } as unknown as IEngine;
    const controller = createRouter({ engine, routes: [] });
    controller.start();
    const newEntry: any = { id: "id-2", url: new URL("https://example.com/a"), index: 1 };
    const newRoutes: any[] = [{ path: "/a" }];

    // 実行
    capturedUpdate({ entry: newEntry, routes: newRoutes as any });

    // 検証
    expect(controller.getRoutes()).toBe(newRoutes);
    expect(controller.getSnapshot().currentEntry).toBe(newEntry);
  });

  test("複数の購読者に通知し unsubscribe 後は通知しない", ({ expect }) => {
    // 準備
    let capturedUpdate!: IEngine.StartArgs["update"];
    const engine = {
      init: () => null,
      start: (args: IEngine.StartArgs) => {
        capturedUpdate = args.update;
      },
      submit: () => {},
      navigate: () => {},
    } as unknown as IEngine;
    const controller = createRouter({ engine, routes: [] });
    controller.start();
    let countA = 0;
    let countB = 0;
    const unsubA = controller.subscribe(() => {
      countA += 1;
    });
    controller.subscribe(() => {
      countB += 1;
    });

    // 実行
    capturedUpdate();
    unsubA();
    capturedUpdate();

    // 検証
    expect(countA).toBe(1);
    expect(countB).toBe(2);
  });
});

describe("createRouter の start/stop", () => {
  test("stop が関数でない (void) 場合でも abort して終了できる", ({ expect }) => {
    // 準備
    let capturedSignal: AbortSignal | undefined;
    const engine = {
      init: (args: IEngine.InitArgs) => {
        capturedSignal = args.getSignal();

        return null;
      },
      start: () => {},
      submit: () => {},
      navigate: () => {},
    } as unknown as IEngine;
    const controller = createRouter({ engine, routes: [] });
    const stop = controller.start();

    // 実行
    stop();

    // 検証
    expect(capturedSignal!.aborted).toBe(true);
  });

  test("stop 関数が呼ばれ ac がリセットされる", ({ expect }) => {
    // 準備
    const stopFn = vi.fn<() => void>();
    let firstSignal!: AbortSignal;
    let secondSignal!: AbortSignal;
    let startCall = 0;
    const engine = {
      init: () => null,
      start: (args: IEngine.StartArgs) => {
        startCall += 1;
        if (startCall === 1) {
          firstSignal = args.getSignal();
        } else {
          secondSignal = args.getSignal();
        }

        return stopFn;
      },
      submit: () => {},
      navigate: () => {},
    } as unknown as IEngine;
    const controller = createRouter({ engine, routes: [] });

    // 実行
    const stop1 = controller.start();
    stop1();
    const stop2 = controller.start();

    // 検証
    expect(stopFn).toHaveBeenCalledTimes(1);
    expect(firstSignal.aborted).toBe(true);
    expect(secondSignal).not.toBe(firstSignal);
    stop2();
  });
});

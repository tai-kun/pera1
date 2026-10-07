import { NinjaPromise } from "ninja-promise";
import { describe, test, vi } from "vitest";

import { UnreachableError } from "../../src/core/errors.js";
import type { LoaderFunction, ShouldReloadFunction } from "../../src/core/route.types.js";
import startLoaders from "../../src/core/start-loaders.js";

describe("startLoaders の分岐網羅", () => {
  test("prevParams が存在するとき shouldReload に渡される", ({ expect, signal }) => {
    // 準備
    let captured: any = null;
    const shouldReload: ShouldReloadFunction = (args) => {
      captured = args;

      return false;
    };
    const loader = (() => "data") as unknown as LoaderFunction;
    const prevRoute: any = { path: "/a", params: { id: "1" } };
    const currentRoute: any = { path: "/a", params: {}, loader, shouldReload };
    const cached = NinjaPromise.resolve("old");
    const store = new Map();
    store.set("prev-id", new Map([[loader, cached]]));

    // 実行
    startLoaders({
      prevRoutes: [prevRoute],
      currentRoutes: [currentRoute],
      prevEntry: { id: "prev-id" as any, url: { search: "" } as any },
      currentEntry: { id: "curr-id" as any, url: { search: "" } as any },
      loaderDataStore: store,
      signal,
    });

    // 検証
    expect(captured.prevParams).toStrictEqual({ id: "1" });
  });

  test("prevRoutes が空のとき prevParams は空オブジェクトになる", ({ expect, signal }) => {
    // 準備
    let captured: any = null;
    const shouldReload: ShouldReloadFunction = (args) => {
      captured = args;

      return false;
    };
    const loader = (() => "data") as unknown as LoaderFunction;
    const currentRoute: any = { path: "/a", params: {}, loader, shouldReload };
    const cached = NinjaPromise.resolve("old");
    const store = new Map();
    store.set("prev-id", new Map([[loader, cached]]));

    // 実行
    startLoaders({
      prevRoutes: [],
      currentRoutes: [currentRoute],
      prevEntry: { id: "prev-id" as any, url: { search: "" } as any },
      currentEntry: { id: "curr-id" as any, url: { search: "" } as any },
      loaderDataStore: store,
      signal,
    });

    // 検証
    expect(captured.prevParams).toStrictEqual({});
  });

  test("新規パスでは defaultShouldReload が true になる", ({ expect, signal }) => {
    // 準備
    let captured: any = null;
    const shouldReload: ShouldReloadFunction = (args) => {
      captured = args;

      return args.defaultShouldReload;
    };
    const loader = (() => "data") as unknown as LoaderFunction;
    const prevRoute: any = { path: "/old", params: {} };
    const currentRoute: any = { path: "/new", params: {}, loader, shouldReload };
    const cached = NinjaPromise.resolve("old");
    const store = new Map();
    store.set("prev-id", new Map([[loader, cached]]));

    // 実行
    startLoaders({
      prevRoutes: [prevRoute],
      currentRoutes: [currentRoute],
      prevEntry: { id: "prev-id" as any, url: { search: "" } as any },
      currentEntry: { id: "curr-id" as any, url: { search: "" } as any },
      loaderDataStore: store,
      signal,
    });

    // 検証
    expect(captured.defaultShouldReload).toBe(true);
  });

  test("不正なステータスでは UnreachableError を投げる", ({ expect, signal }) => {
    // 準備
    const loader = (() => "data") as unknown as LoaderFunction;
    const shouldReload = (() => true) as unknown as ShouldReloadFunction;
    const route: any = { path: "/a", params: {}, loader, shouldReload };
    const cached = NinjaPromise.resolve("old");
    const store = new Map();
    store.set("prev-id", new Map([[loader, cached]]));
    using spy = vi.spyOn(NinjaPromise, "try").mockReturnValue({ status: "weird" } as any);

    // 実行と検証
    expect(() =>
      startLoaders({
        prevRoutes: [route],
        currentRoutes: [route],
        prevEntry: { id: "prev-id" as any, url: { search: "" } as any },
        currentEntry: { id: "curr-id" as any, url: { search: "" } as any },
        loaderDataStore: store,
        signal,
      }),
    ).toThrow(UnreachableError);
    expect(spy).toHaveBeenCalled();
  });
});

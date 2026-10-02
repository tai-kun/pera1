import * as v from "valibot";
import { describe, test, vi } from "vitest";

import HistoryEntryUrlSchema from "../../src/core/history-entry-url-schema.js";
import initLoaders from "../../src/core/init-loaders.js";
import RedirectResponse from "../../src/core/redirect-response.js";
import type RouteRequest from "../../src/core/route-request.js";

const url = (s: string) => v.parse(HistoryEntryUrlSchema(), s);

test("空のルート配列を渡したとき、空の Map が返される", ({ expect, signal }) => {
  // 準備
  const routes: any[] = [];
  const request = {
    url: url("http://localhost/"),
    signal,
  };

  // 実行
  const result = initLoaders(routes, request);

  // 検証
  expect(result).toStrictEqual(new Map());
});

test("単一の有効なローダーを渡したとき、ローダーが実行され結果がラップされた Map になる", async ({
  expect,
  signal,
}) => {
  // 準備
  const loader = () => "data";
  const routes = [
    {
      loader,
      params: {
        id: "1",
      },
    },
  ];
  const request = {
    url: url("http://localhost/"),
    signal,
  };

  // 実行
  const result = initLoaders(routes, request);

  // 検証
  expect(result.size).toStrictEqual(1);
  expect(result.has(loader)).toStrictEqual(true);

  const ninjaPromise = result.get(loader)!;
  const resolvedValue = await ninjaPromise;
  expect(resolvedValue).toBe("data");
});

test("複数の有効なローダーを渡したとき、すべてのローダーが Map に登録されそれぞれの結果を保持する", async ({
  expect,
  signal,
}) => {
  // 準備
  const loader1 = () => "data1";
  const loader2 = () => "data2";
  const routes = [
    {
      loader: loader1,
      params: {
        id: "1",
      },
    },
    {
      loader: loader2,
      params: {
        id: "2",
      },
    },
  ];
  const request = {
    url: url("http://localhost/"),
    signal,
  };

  // 実行
  const result = initLoaders(routes, request);

  // 検証
  expect(Array.from(result.keys())).toStrictEqual([loader1, loader2]);

  const resolvedValue1 = await result.get(loader1)!;
  const resolvedValue2 = await result.get(loader2)!;
  expect(resolvedValue1).toBe("data1");
  expect(resolvedValue2).toBe("data2");
});

test("複数のローダーを渡したとき、すべてのローダーに全く同じ RouteRequest インスタンスが渡される", ({
  expect,
  signal,
}) => {
  // 準備
  let request1: RouteRequest | undefined;
  let request2: RouteRequest | undefined;
  const loader1 = (args: any) => {
    request1 = args.request;
  };
  const loader2 = (args: any) => {
    request2 = args.request;
  };
  const routes = [
    {
      loader: loader1,
      params: {},
    },
    {
      loader: loader2,
      params: {},
    },
  ];
  const request = {
    url: url("http://localhost/"),
    signal,
  };

  // 実行
  initLoaders(routes, request);

  // 検証
  expect(request1).not.toBe(undefined);
  expect(request1).toStrictEqual(request2);
});

test("ローダーが Promise を返すとき、非同期処理が正しくラップされ解決される", async ({
  expect,
  signal,
}) => {
  // 準備
  const loader = () => Promise.resolve("async");
  const routes = [
    {
      loader,
      params: {},
    },
  ];
  const request = {
    url: url("http://localhost/"),
    signal,
  };

  // 実行
  const result = initLoaders(routes, request);

  // 検証
  const ninjaPromise = result.get(loader)!;
  const resolvedValue = await ninjaPromise;
  expect(resolvedValue).toBe("async");
});

test("ローダー実行時に同期エラーが投げられたとき、例外を投げずに NinjaPromise がリジェクトされる", async ({
  expect,
  signal,
}) => {
  // 準備
  const error = new Error("Fail");
  const loader = () => {
    throw error;
  };
  const routes = [
    {
      loader,
      params: {},
    },
  ];
  const request = {
    url: url("http://localhost/"),
    signal,
  };

  // 実行
  const result = initLoaders(routes, request);

  // 検証
  expect(result.has(loader)).toStrictEqual(true);

  const ninjaPromise = result.get(loader)!;
  await expect(ninjaPromise).rejects.toStrictEqual(error);
});

test("loader が関数ではない要素が含まれるとき、その要素はスキップされる", ({ expect, signal }) => {
  // 準備
  const validLoader = () => "valid";
  const routes = [
    {
      loader: undefined,
      params: {},
    },
    {
      loader: validLoader,
      params: {},
    },
  ];
  const request = {
    url: url("http://localhost/"),
    signal,
  };

  // 実行
  const result = initLoaders(routes, request);

  // 検証
  expect(result.size).toStrictEqual(1);
  expect(result.has(validLoader)).toStrictEqual(true);
});

test("同一のローダーインスタンスが複数回含まれるとき、Map の特性により最後の要素で上書きされる", async ({
  expect,
  signal,
}) => {
  // 準備
  const sharedLoader = (args: any) => args.params.p;
  const routes = [
    {
      loader: sharedLoader,
      params: {
        p: "1",
      },
    },
    {
      loader: sharedLoader,
      params: {
        p: "2",
      },
    },
  ];
  const request = {
    url: url("http://localhost/"),
    signal,
  };

  // 実行
  const result = initLoaders(routes, request);

  // 検証
  expect(result.size).toStrictEqual(1);

  const ninjaPromise = result.get(sharedLoader)!;
  const resolvedValue = await ninjaPromise;
  expect(resolvedValue).toBe("2");
});

test("params が空のオブジェクトのとき、ローダー関数に空の params オブジェクトが渡される", ({
  expect,
  signal,
}) => {
  // 準備
  let passedParams: any;
  const loader = (args: any) => {
    passedParams = args.params;
  };
  const routes = [
    {
      loader,
      params: {},
    },
  ];
  const request = {
    url: url("http://localhost/"),
    signal,
  };

  // 実行
  initLoaders(routes, request);

  // 検証
  expect(passedParams).toStrictEqual({});
});

describe("initLoaders のエッジケース", () => {
  test("rejected Promise を返す loader は rejected として格納される", async ({
    expect,
    signal,
  }) => {
    // 準備
    const error = new Error("fail");
    const loader = vi.fn<() => Promise<never>>(() => Promise.reject(error));
    const routes: any[] = [{ loader, params: {} }];
    const testUrl = url("https://example.com/");

    // 実行
    const map = initLoaders(routes, { url: testUrl, signal });

    // 検証
    const promise = map.get(loader)!;
    await expect(promise).rejects.toThrow(error);
  });

  test("RedirectResponse を返す loader はそのまま格納される", async ({ expect, signal }) => {
    // 準備
    const response = new RedirectResponse("/redirect");
    const loader = vi.fn<() => any>(() => response);
    const routes: any[] = [{ loader, params: {} }];
    const testUrl = url("https://example.com/");

    // 実行
    const map = initLoaders(routes, { url: testUrl, signal });

    // 検証
    const promise = map.get(loader)!;
    await expect(promise).resolves.toBe(response);
  });

  test("一部の loader が throw しても他に影響しない", async ({ expect, signal }) => {
    // 準備
    // oxlint-disable-next-line vitest/require-mock-type-parameters
    const okLoader = vi.fn(() => "ok");
    // oxlint-disable-next-line vitest/require-mock-type-parameters
    const errLoader = vi.fn(() => {
      throw new Error("boom");
    });
    const routes: any[] = [
      { loader: okLoader, params: {} },
      { loader: errLoader, params: {} },
    ];
    const testUrl = url("https://example.com/");

    // 実行
    const map = initLoaders(routes, { url: testUrl, signal });

    // 検証
    await expect(map.get(okLoader)!).resolves.toBe("ok");
    await expect(map.get(errLoader)!).rejects.toThrow("boom");
  });

  test("request オブジェクトは全 loader で共有される", ({ expect, signal }) => {
    // 準備
    const captured: any[] = [];
    // oxlint-disable-next-line vitest/require-mock-type-parameters
    const loader1 = vi.fn((args: any) => {
      captured.push(args.request);
      return "1";
    });
    // oxlint-disable-next-line vitest/require-mock-type-parameters
    const loader2 = vi.fn((args: any) => {
      captured.push(args.request);
      return "2";
    });
    const routes: any[] = [
      { loader: loader1, params: {} },
      { loader: loader2, params: {} },
    ];
    const testUrl = url("https://example.com/");

    // 実行
    initLoaders(routes, { url: testUrl, signal });

    // 検証
    expect(captured[0]).toBe(captured[1]);
  });

  test("abort 済みの signal でも loader は呼び出される", ({ expect }) => {
    // 準備
    const controller = new AbortController();
    controller.abort();
    // oxlint-disable-next-line vitest/require-mock-type-parameters
    const loader = vi.fn(() => "data");
    const routes: any[] = [{ loader, params: {} }];
    const testUrl = url("https://example.com/");

    // 実行
    const map = initLoaders(routes, { url: testUrl, signal: controller.signal });

    // 検証
    expect(map.has(loader)).toBe(true);
  });
});

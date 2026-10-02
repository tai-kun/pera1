import type { FulfilledNinjaPromise, RejectedNinjaPromise } from "ninja-promise";
import * as v from "valibot";
import { describe, test } from "vitest";

import HistoryEntryUrlSchema from "../../src/core/history-entry-url-schema.js";
import type { HistoryEntryUrl } from "../../src/core/history-entry-url-schema.js";
import RedirectResponse from "../../src/core/redirect-response.js";
import startAction from "../../src/core/start-action.js";

const url = (s: string) => v.parse(HistoryEntryUrlSchema(), s);

test("該当するアクション関数が存在しない場合、 null を返す", ({ expect, signal }) => {
  // 準備
  const request = {
    url: url("http://localhost/user"),
    formData: new FormData(),
    signal,
  };
  const routes = [
    {
      action: undefined,
      urlPath: "/user",
      params: {},
    },
  ];

  // 実行
  const result = startAction(routes, request);

  // 検証
  expect(result).toBe(null);
});

test("リクエスト URL パスに前方一致する最初のアクション関数を選出して実行する", ({
  expect,
  signal,
}) => {
  // 準備
  const request = {
    url: url("http://localhost/user/profile"),
    formData: new FormData(),
    signal,
  };
  const fnA = () => "A";
  const fnB = () => "B";
  const routes = [
    {
      action: fnA,
      urlPath: "/user",
      params: {},
    },
    {
      action: fnB,
      urlPath: "/user/profile",
      params: {},
    },
  ];

  // 実行
  const result = startAction(routes, request);

  // 検証
  expect(result).not.toBe(null);
  expect(result!.func).toStrictEqual(fnA);
});

test("同期的に通常のデータを返す場合、 fulfilled 状態になりリダイレクト情報を返さない", async ({
  expect,
  signal,
}) => {
  // 準備
  const request = {
    url: url("http://localhost/"),
    formData: new FormData(),
    signal,
  };
  const routes = [
    {
      action: () => "success",
      urlPath: "/",
      params: {
        id: "1",
      },
    },
  ];

  // 実行
  const result = startAction(routes, request);

  // 検証
  expect(result).not.toBe(null);
  expect(result!.data.status).toBe("fulfilled");
  expect((result!.data as FulfilledNinjaPromise<unknown>).value).toBe("success");

  const idleResult = await result!.idle();
  expect(idleResult).toStrictEqual({
    redirectTo: undefined,
  });
});

test("同期的に RedirectResponse を返す場合、データを隠蔽しリダイレクト情報を返す", async ({
  expect,
  signal,
}) => {
  // 準備
  const request = {
    url: url("http://localhost/"),
    formData: new FormData(),
    signal,
  };
  const redirectResponse = new RedirectResponse("/home");
  const routes = [
    {
      action: () => redirectResponse,
      urlPath: "/",
      params: {},
    },
  ];

  // 実行
  const result = startAction(routes, request);

  // 検証
  expect(result).not.toBe(null);
  expect(result!.data.status).toBe("fulfilled");
  expect((result!.data as FulfilledNinjaPromise<unknown>).value).toBe(undefined);

  const idleResult = await result!.idle();
  expect(idleResult).toStrictEqual({
    redirectTo: redirectResponse,
  });
});

test("非同期で通常のデータを返す場合、完了後に解決されたデータを返す", async ({
  expect,
  signal,
}) => {
  // 準備
  const request = {
    url: url("http://localhost/"),
    formData: new FormData(),
    signal,
  };
  const { promise, resolve } = Promise.withResolvers<string>();
  const routes = [
    {
      action: () => promise,
      urlPath: "/",
      params: {},
    },
  ];

  // 実行
  const result = startAction(routes, request);

  // 検証
  expect(result).not.toBe(null);
  expect(result!.data.status).toBe("pending");

  resolve("async_data");
  await promise;
  await result?.data;

  expect(result!.data.status).toBe("fulfilled");
  expect((result!.data as FulfilledNinjaPromise<unknown>).value).toBe("async_data");

  const idleResult = await result!.idle();
  expect(idleResult).toStrictEqual({
    redirectTo: undefined,
  });
});

test("非同期で RedirectResponse を返す場合、データを隠蔽しリダイレクト情報を返す", async ({
  expect,
  signal,
}) => {
  // 準備
  const request = {
    url: url("http://localhost/"),
    formData: new FormData(),
    signal,
  };
  const redirectResponse = new RedirectResponse("/login");
  const promise = Promise.resolve(redirectResponse);
  const routes = [
    {
      action: () => promise,
      urlPath: "/",
      params: {},
    },
  ];

  // 実行
  const result = startAction(routes, request);
  await promise;
  await result?.data;

  // 検証
  expect(result).not.toBe(null);
  expect(result!.data.status).toBe("fulfilled");
  expect((result!.data as FulfilledNinjaPromise<unknown>).value).toBe(undefined);

  const idleResult = await result!.idle();
  expect(idleResult).toStrictEqual({
    redirectTo: redirectResponse,
  });
});

test("同期実行時に例外が投げられた場合、 rejected 状態になり例外を内部でトラップする", async ({
  expect,
  signal,
}) => {
  // 準備
  const request = {
    url: url("http://localhost/"),
    formData: new FormData(),
    signal,
  };
  const error = new Error("Sync Fail");
  const routes = [
    {
      action: () => {
        throw error;
      },
      urlPath: "/",
      params: {},
    },
  ];

  // 実行
  const result = startAction(routes, request);

  // 検証
  expect(result).not.toBe(null);
  expect(result!.data.status).toBe("rejected");
  expect((result!.data as RejectedNinjaPromise).reason).toStrictEqual(error);

  const idleResult = await result!.idle();
  expect(idleResult).toStrictEqual({
    redirectTo: undefined,
  });
});

test("非同期実行時に Promise が拒否された場合、 rejected 状態になり例外を内部でトラップする", async ({
  expect,
  signal,
}) => {
  // 準備
  const request = {
    url: url("http://localhost/"),
    formData: new FormData(),
    signal,
  };
  const error = new Error("Async Fail");
  const promise = Promise.reject(error);
  const routes = [
    {
      action: () => promise,
      urlPath: "/",
      params: {},
    },
  ];

  // 実行
  const result = startAction(routes, request);

  // Promise の拒否を捕捉してテストの失敗を防ぐ。
  await result?.data.then(
    () => {},
    () => {},
  );

  // 検証
  expect(result).not.toBe(null);
  expect(result!.data.status).toBe("rejected");
  expect((result!.data as RejectedNinjaPromise).reason).toStrictEqual(error);

  const idleResult = await result!.idle();
  expect(idleResult).toStrictEqual({
    redirectTo: undefined,
  });
});

test("routes はリクエストの URL に適合することが前提", ({ expect, signal }) => {
  // 準備
  const request = {
    url: url("http://localhost/users/items"),
    formData: new FormData(),
    signal,
  };
  const fn = () => "unmatched";
  const routes = [
    {
      action: fn,
      urlPath: "/items",
      params: {},
    },
  ];

  // 実行
  const result = startAction(routes, request);

  // 検証
  expect(result).toBeNull();
});

test("action プロパティーが関数ではない場合はスキップする", ({ expect, signal }) => {
  // 準備
  const request = {
    url: url("http://localhost/"),
    formData: new FormData(),
    signal,
  };
  const routes = [
    {
      action: "not_a_function",
      urlPath: "/",
      params: {},
    },
  ];

  // 実行
  // @ts-expect-error - 不正な型をテストする
  const result = startAction(routes, request);

  // 検証
  expect(result).toBe(null);
});

describe("startAction のセグメント境界", () => {
  test("部分一致する prefix だけではマッチしない", ({ expect, signal }) => {
    // 準備
    const routes: any[] = [
      { path: "/foo", action: () => "foo", params: {}, urlPath: "/foo" },
      { path: "/foo-bar", action: () => "foobar", params: {}, urlPath: "/foo-bar" },
    ];
    const url = new URL("https://example.com/foo-bar");

    // 実行
    const result = startAction(routes, {
      url: url as unknown as HistoryEntryUrl,
      formData: new FormData(),
      signal,
    });

    // 検証
    expect(result).not.toBeNull();
    expect(result!.func).toBe(routes[1]!.action);
  });

  test("セグメント境界を跨ぐ prefix では null を返す", ({ expect, signal }) => {
    // 準備
    const action = () => "foo";
    const routes: any[] = [{ path: "/users", action, params: {}, urlPath: "/users" }];
    const url = new URL("https://example.com/usersettings");

    // 実行
    const result = startAction(routes, {
      url: url as unknown as HistoryEntryUrl,
      formData: new FormData(),
      signal,
    });

    // 検証
    expect(result).toBeNull();
  });
});

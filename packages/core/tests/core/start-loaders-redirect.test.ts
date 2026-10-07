import { describe, test, vi } from "vitest";

import RedirectResponse from "../../src/core/redirect-response.js";
import type { LoaderFunction } from "../../src/core/route.types.js";
import startLoaders from "../../src/core/start-loaders.js";

describe("startLoaders のリダイレクト検出", () => {
  test("同期的に RedirectResponse を返す場合、idle() が redirectTo を返す", async ({
    expect,
    signal,
  }) => {
    // 準備
    const redirectResponse = new RedirectResponse("/login");
    const mockLoader = vi.fn<LoaderFunction>().mockReturnValue(redirectResponse);
    const dataStore = new Map();
    const args: any = {
      prevRoutes: [],
      currentRoutes: [{ path: "/dashboard", loader: mockLoader, params: {} }],
      prevEntry: { id: "entry-1", url: { search: "" } },
      currentEntry: { id: "entry-2", url: { search: "" } },
      loaderDataStore: dataStore,
      signal,
    };

    // 実行
    const started = startLoaders(args);
    const { redirectTo } = await started.idle();

    // 検証
    expect(redirectTo).toBe(redirectResponse);
  });

  test("非同期で RedirectResponse を返す場合、idle() が redirectTo を返す", async ({
    expect,
    signal,
  }) => {
    // 準備
    const redirectResponse = new RedirectResponse("/login");
    const mockLoader = vi
      .fn<LoaderFunction>()
      .mockReturnValue(Promise.resolve(redirectResponse));
    const dataStore = new Map();
    const args: any = {
      prevRoutes: [],
      currentRoutes: [{ path: "/dashboard", loader: mockLoader, params: {} }],
      prevEntry: { id: "entry-1", url: { search: "" } },
      currentEntry: { id: "entry-2", url: { search: "" } },
      loaderDataStore: dataStore,
      signal,
    };

    // 実行
    const started = startLoaders(args);
    const { redirectTo } = await started.idle();

    // 検証
    expect(redirectTo).toBe(redirectResponse);
  });

  test("通常のデータを返す場合、redirectTo は undefined になる", async ({
    expect,
    signal,
  }) => {
    // 準備
    const mockLoader = vi.fn<LoaderFunction>().mockReturnValue(Promise.resolve({ user: "alice" }));
    const dataStore = new Map();
    const args: any = {
      prevRoutes: [],
      currentRoutes: [{ path: "/dashboard", loader: mockLoader, params: {} }],
      prevEntry: { id: "entry-1", url: { search: "" } },
      currentEntry: { id: "entry-2", url: { search: "" } },
      loaderDataStore: dataStore,
      signal,
    };

    // 実行
    const started = startLoaders(args);
    const { redirectTo } = await started.idle();

    // 検証
    expect(redirectTo).toBeUndefined();
  });

  test("複数のローダーがリダイレクトを返す場合、ルート評価順で最初のものを返す", async ({
    expect,
    signal,
  }) => {
    // 準備
    const first = new RedirectResponse("/first");
    const second = new RedirectResponse("/second");
    const loader1 = vi.fn<LoaderFunction>().mockReturnValue(first);
    const loader2 = vi.fn<LoaderFunction>().mockReturnValue(second);
    const dataStore = new Map();
    const args: any = {
      prevRoutes: [],
      currentRoutes: [
        { path: "/a", loader: loader1, params: {} },
        { path: "/a/b", loader: loader2, params: {} },
      ],
      prevEntry: { id: "entry-1", url: { search: "" } },
      currentEntry: { id: "entry-2", url: { search: "" } },
      loaderDataStore: dataStore,
      signal,
    };

    // 実行
    const started = startLoaders(args);
    const { redirectTo } = await started.idle();

    // 検証
    expect(redirectTo).toBe(first);
  });

  test("リダイレクト応答は解決されないプロミスとして公開する", async ({ expect, signal }) => {
    // 準備
    const redirectResponse = new RedirectResponse("/login");
    const mockLoader = vi.fn<LoaderFunction>().mockReturnValue(redirectResponse);
    const dataStore = new Map();
    const args: any = {
      prevRoutes: [],
      currentRoutes: [{ path: "/dashboard", loader: mockLoader, params: {} }],
      prevEntry: { id: "entry-1", url: { search: "" } },
      currentEntry: { id: "entry-2", url: { search: "" } },
      loaderDataStore: dataStore,
      signal,
    };

    // 実行
    const started = startLoaders(args);
    const { redirectTo } = await started.idle();

    // 検証: エンジン側では回収される
    expect(redirectTo).toBe(redirectResponse);

    // 検証: 公開ストアでは解決されない
    const stored = dataStore.get("entry-2")?.get(mockLoader);
    expect(stored).toBeDefined();
    expect(stored!.status).toBe("pending");
  });

  test("ローダーが存在しない場合、redirectTo は undefined になる", async ({
    expect,
    signal,
  }) => {
    // 準備
    const dataStore = new Map();
    const args: any = {
      prevRoutes: [],
      currentRoutes: [{ path: "/no-loader" }],
      prevEntry: { id: "entry-1", url: { search: "" } },
      currentEntry: { id: "entry-2", url: { search: "" } },
      loaderDataStore: dataStore,
      signal,
    };

    // 実行
    const started = startLoaders(args);
    const { redirectTo } = await started.idle();

    // 検証
    expect(redirectTo).toBeUndefined();
  });
});

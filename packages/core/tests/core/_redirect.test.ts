import { describe, test, vi } from "vitest";

import {
  createBarePathLoader,
  findIndexChildTarget,
  resolveRedirectDestination,
} from "../../src/core/_redirect.js";
import processRoutes from "../../src/core/_process-routes.js";
import type { HistoryEntryId } from "../../src/core/history-entry-id-schema.js";
import type { HistoryEntryUrl } from "../../src/core/history-entry-url-schema.js";
import matchRoutes from "../../src/core/match-routes.js";
import RedirectResponse from "../../src/core/redirect-response.js";
import type { LoaderFunction, ShouldReloadFunction } from "../../src/core/route.types.js";
import startLoaders from "../../src/core/start-loaders.js";

const url = (pathname: string): HistoryEntryUrl =>
  new URL(`https://example.com${pathname}`) as unknown as HistoryEntryUrl;

const entry = (
  id: string,
  pathname: string,
): { readonly id: HistoryEntryId; readonly url: HistoryEntryUrl } => ({
  id: id as unknown as HistoryEntryId,
  url: url(pathname),
});

const loaderArgs = (pathname: string, params: Record<string, string> = {}): any => ({
  params,
  request: { url: url(pathname), signal: new AbortController().signal },
});

const reloadArgs = (
  prevPathname: string,
  currentPathname: string,
  defaultShouldReload = false,
): any => ({
  prevUrl: url(prevPathname),
  currentUrl: url(currentPathname),
  prevParams: {},
  currentParams: {},
  triggerMethod: "GET",
  defaultShouldReload,
});

describe("findIndexChildTarget", () => {
  test("同一パスの index があれば誘導しない", ({ expect }) => {
    const entries = [
      { fullPath: "/", index: false, order: 0 },
      { fullPath: "/", index: true, order: 1 },
    ];
    expect(findIndexChildTarget(entries, "/")).toBeUndefined();
  });

  test("最も浅い index を選ぶ", ({ expect }) => {
    const entries = [
      { fullPath: "/travel", index: false, order: 0 },
      { fullPath: "/travel/search/results", index: true, order: 1 },
      { fullPath: "/travel/search", index: true, order: 2 },
    ];
    expect(findIndexChildTarget(entries, "/travel")).toBe("/travel/search");
  });

  test("同点時は定義順序が早いものを選ぶ", ({ expect }) => {
    const entries = [
      { fullPath: "/app", index: false, order: 0 },
      { fullPath: "/app/settings", index: true, order: 1 },
      { fullPath: "/app/dashboard", index: true, order: 2 },
    ];
    expect(findIndexChildTarget(entries, "/app")).toBe("/app/settings");
  });

  test("該当なしは undefined を返す", ({ expect }) => {
    const entries = [{ fullPath: "/users/:userId", index: false, order: 0 }];
    expect(findIndexChildTarget(entries, "/users/123")).toBeUndefined();
  });

  test("ワイルドカードは候補にしない", ({ expect }) => {
    const entries = [
      { fullPath: "/files", index: false, order: 0 },
      { fullPath: "/*", index: true, order: 1 },
    ];
    expect(findIndexChildTarget(entries, "/files")).toBeUndefined();
  });
});

describe("resolveRedirectDestination", () => {
  test("絶対パスはそのまま返す", ({ expect }) => {
    expect(resolveRedirectDestination("/app/dashboard", {})).toBe("/app/dashboard");
  });

  test("プレースホルダーをパラメーターで埋める", ({ expect }) => {
    expect(
      resolveRedirectDestination("/app/projects/:projectId/overview", { projectId: "42" }),
    ).toBe("/app/projects/42/overview");
  });
});

describe("合成ローダーの発火条件", () => {
  test("裸パスでは RedirectResponse を返す", async ({ expect }) => {
    // 準備
    const userLoader = vi.fn<LoaderFunction>().mockReturnValue({ authenticated: true });
    const { loader } = createBarePathLoader({
      fullPath: "/app",
      target: "/app/dashboard",
      loader: userLoader,
      shouldReload: undefined,
    });

    // 実行
    const data = (await loader(loaderArgs("/app"))) as RedirectResponse;

    // 検証
    expect(data).toBeInstanceOf(RedirectResponse);
    expect(data.pathname).toBe("/app/dashboard");
  });

  test("子パスでは利用者のローダー結果をそのまま通す", async ({ expect }) => {
    // 準備
    const userData = { authenticated: true };
    const userLoader = vi.fn<LoaderFunction>().mockReturnValue(userData);
    const { loader } = createBarePathLoader({
      fullPath: "/app",
      target: "/app/dashboard",
      loader: userLoader,
      shouldReload: undefined,
    });

    // 実行
    const data = await loader(loaderArgs("/app/dashboard"));

    // 検証
    expect(data).toBe(userData);
    expect(userLoader).toHaveBeenCalledOnce();
  });

  test("利用者のリダイレクトを優先する", async ({ expect }) => {
    // 準備
    const loginRedirect = new RedirectResponse("/login?redirectTo=/app");
    const userLoader = vi.fn<LoaderFunction>().mockReturnValue(loginRedirect);
    const { loader } = createBarePathLoader({
      fullPath: "/app",
      target: "/app/dashboard",
      loader: userLoader,
      shouldReload: undefined,
    });

    // 実行
    const data = await loader(loaderArgs("/app"));

    // 検証
    expect(data).toBe(loginRedirect);
  });

  test("動的パラメーターを含む裸パスで誘導先を組み立てる", async ({ expect }) => {
    // 準備
    const { loader } = createBarePathLoader({
      fullPath: "/app/projects/:projectId",
      target: "/app/projects/:projectId/overview",
      loader: undefined,
      shouldReload: undefined,
    });

    // 実行
    const redirect = (await loader(
      loaderArgs("/app/projects/42", { projectId: "42" }),
    )) as RedirectResponse;

    // 検証
    expect(redirect.pathname).toBe("/app/projects/42/overview");
  });
});

describe("合成 shouldReload の再利用防止", () => {
  test("裸パスが絡む遷移では無条件に再実行する", ({ expect }) => {
    // 準備
    const userShouldReload = vi.fn<ShouldReloadFunction>().mockReturnValue(false);
    const { shouldReload } = createBarePathLoader({
      fullPath: "/app",
      target: "/app/dashboard",
      loader: undefined,
      shouldReload: userShouldReload,
    });

    // 実行と検証
    expect(shouldReload(reloadArgs("/app/dashboard", "/app"))).toBe(true);
    expect(shouldReload(reloadArgs("/app", "/app/dashboard"))).toBe(true);
    expect(userShouldReload).not.toHaveBeenCalled();
  });

  test("裸パスが絡まない遷移では利用者の判定に委ねる", ({ expect }) => {
    // 準備
    const userShouldReload = vi.fn<ShouldReloadFunction>().mockReturnValue(false);
    const { shouldReload } = createBarePathLoader({
      fullPath: "/app",
      target: "/app/dashboard",
      loader: undefined,
      shouldReload: userShouldReload,
    });

    // 実行と検証
    expect(shouldReload(reloadArgs("/app/dashboard", "/app/projects"))).toBe(false);
    expect(userShouldReload).toHaveBeenCalledOnce();
  });
});

describe("processRoutes との統合", () => {
  test("子の index がある裸パス親に loader が合成される", ({ expect }) => {
    // 準備
    const userLoader = (() => ({ ok: true })) as LoaderFunction;

    // 実行
    const routes = processRoutes([
      { path: "/app", loader: userLoader },
      { path: "/app/dashboard", index: true },
    ]);

    // 検証
    expect(routes.find((r) => r.path === "/app")?.loader).not.toBe(userLoader);
  });

  test("同一パスの index がある親には合成しない", ({ expect }) => {
    // 準備
    const userLoader = (() => ({ ok: true })) as LoaderFunction;

    // 実行
    const routes = processRoutes([
      { path: "/", loader: userLoader },
      { path: "/", index: true },
    ]);

    // 検証
    expect(routes.find((r) => r.path === "/" && !r.index)?.loader).toBe(userLoader);
  });

  test("子の index がない親には合成しない", ({ expect }) => {
    // 準備
    const userLoader = (() => ({ ok: true })) as LoaderFunction;

    // 実行
    const routes = processRoutes([
      { path: "/users/:userId", loader: userLoader },
      { path: "/users", index: true },
    ]);

    // 検証
    expect(routes.find((r) => r.path === "/users/:userId")?.loader).toBe(userLoader);
  });

  test("廃止された redirect 指定は無視して自動決定が働く", ({ expect }) => {
    // 準備: 旧オプション付きの定義を any 経由で渡す
    const legacy = { path: "/app", redirect: "/app/dashboard" } as any;

    // 実行
    const routes = processRoutes([legacy, { path: "/app/dashboard", index: true }]);

    // 検証: 不明なプロパティーに影響されず誘導が成立する
    expect(routes.find((r) => r.path === "/app")?.loader).toBeDefined();
  });
});

describe("startLoaders との統合", () => {
  test("裸パスで自動誘導し子遷移時に再利用しない", async ({ expect, signal }) => {
    // 準備
    const userLoader = vi.fn<LoaderFunction>().mockReturnValue({ authenticated: true });
    const routes = processRoutes([
      { path: "/app", loader: userLoader },
      { path: "/app/dashboard", index: true },
    ]);
    const loaderDataStore = new Map();
    const prevEntry = entry("entry-1", "/app");
    const currentEntry = entry("entry-2", "/app/dashboard");

    // 実行1: 裸パスへの遷移でリダイレクトが発生する
    const first = startLoaders({
      prevRoutes: [],
      currentRoutes: matchRoutes(routes, prevEntry.url)! as any,
      prevEntry: entry("entry-0", "/"),
      currentEntry: prevEntry,
      loaderDataStore,
      signal,
    });
    const { redirectTo: firstRedirect } = await first.idle();
    expect(firstRedirect).toBeInstanceOf(RedirectResponse);

    // 実行2: 子への遷移では再実行しリダイレクトしない
    const second = startLoaders({
      prevRoutes: matchRoutes(routes, prevEntry.url)! as any,
      currentRoutes: matchRoutes(routes, currentEntry.url)! as any,
      prevEntry,
      currentEntry,
      loaderDataStore,
      signal,
    });
    const { redirectTo: secondRedirect } = await second.idle();

    // 検証
    expect(secondRedirect).toBeUndefined();
    expect(userLoader.mock.calls.length).toBeGreaterThanOrEqual(2);
  });
});

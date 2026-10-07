import { describe, test, vi } from "vitest";

import {
  createRedirectLoader,
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

describe("resolveRedirectDestination", () => {
  test("絶対パスはそのまま返す", ({ expect }) => {
    expect(resolveRedirectDestination("/app/dashboard", {}, "/app")).toBe("/app/dashboard");
  });

  test("絶対パスのプレースホルダーをパラメーターで埋める", ({ expect }) => {
    expect(
      resolveRedirectDestination(
        "/app/projects/:projectId/overview",
        { projectId: "42" },
        "/app/projects/42",
      ),
    ).toBe("/app/projects/42/overview");
  });

  test("相対パスは裸パスに結合する", ({ expect }) => {
    expect(resolveRedirectDestination("overview", {}, "/app/projects/42")).toBe(
      "/app/projects/42/overview",
    );
    expect(resolveRedirectDestination("./overview", {}, "/app/projects/42")).toBe(
      "/app/projects/42/overview",
    );
  });

  test("末尾スラッシュ付きの基準パスでも重複スラッシュにならない", ({ expect }) => {
    expect(resolveRedirectDestination("overview", {}, "/app/projects/42/")).toBe(
      "/app/projects/42/overview",
    );
  });

  test("クエリーとハッシュを保持する", ({ expect }) => {
    expect(resolveRedirectDestination("/app/dashboard?tab=1#main", {}, "/app")).toBe(
      "/app/dashboard?tab=1#main",
    );
  });

  test("親相対パスはエラーを投げる", ({ expect }) => {
    expect(() => resolveRedirectDestination("../other", {}, "/app")).toThrow();
    expect(() => resolveRedirectDestination("..", {}, "/app")).toThrow();
  });
});

describe("createRedirectLoader の検証", () => {
  test("空文字や非文字列の誘導先でエラーを投げる", ({ expect }) => {
    expect(() =>
      createRedirectLoader({
        fullPath: "/app",
        template: "",
        loader: undefined,
        shouldReload: undefined,
      }),
    ).toThrow();
    expect(() =>
      createRedirectLoader({
        fullPath: "/app",
        template: 42,
        loader: undefined,
        shouldReload: undefined,
      }),
    ).toThrow();
  });

  test("親相対パスの宣言は正規化時にエラーを投げる", ({ expect }) => {
    expect(() =>
      createRedirectLoader({
        fullPath: "/app",
        template: "../other",
        loader: undefined,
        shouldReload: undefined,
      }),
    ).toThrow();
  });
});

describe("合成ローダーの発火条件", () => {
  test("裸パスでは RedirectResponse を返す", async ({ expect }) => {
    // 準備
    const userLoader = vi.fn<LoaderFunction>().mockReturnValue({ authenticated: true });
    const { loader } = createRedirectLoader({
      fullPath: "/app",
      template: "/app/dashboard",
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
    const { loader } = createRedirectLoader({
      fullPath: "/app",
      template: "/app/dashboard",
      loader: userLoader,
      shouldReload: undefined,
    });

    // 実行
    const data = await loader(loaderArgs("/app/dashboard"));

    // 検証
    expect(data).toBe(userData);
    expect(userLoader).toHaveBeenCalledOnce();
  });

  test("利用者のローダーがなくても裸パスでは誘導し子パスでは undefined を返す", async ({
    expect,
  }) => {
    // 準備
    const { loader } = createRedirectLoader({
      fullPath: "/travel",
      template: "/travel/search",
      loader: undefined,
      shouldReload: undefined,
    });

    // 実行と検証
    const redirect = (await loader(loaderArgs("/travel"))) as RedirectResponse;
    expect(redirect).toBeInstanceOf(RedirectResponse);
    expect(redirect.pathname).toBe("/travel/search");
    await expect(loader(loaderArgs("/travel/search"))).resolves.toBeUndefined();
  });

  test("利用者のリダイレクト (認証ガードなど) を優先する", async ({ expect }) => {
    // 準備
    const loginRedirect = new RedirectResponse("/login?redirectTo=/app");
    const userLoader = vi.fn<LoaderFunction>().mockReturnValue(loginRedirect);
    const { loader } = createRedirectLoader({
      fullPath: "/app",
      template: "/app/dashboard",
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
    const { loader } = createRedirectLoader({
      fullPath: "/app/projects/:projectId",
      template: "/app/projects/:projectId/overview",
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

  test("動的パラメーターの子パスでは発火しない", async ({ expect }) => {
    // 準備
    const userLoader = vi.fn<LoaderFunction>().mockReturnValue({ project: {} });
    const { loader } = createRedirectLoader({
      fullPath: "/app/projects/:projectId",
      template: "/app/projects/:projectId/overview",
      loader: userLoader,
      shouldReload: undefined,
    });

    // 実行
    const data = await loader(loaderArgs("/app/projects/42/tasks", { projectId: "42" }));

    // 検証
    expect(data).toStrictEqual({ project: {} });
  });
});

describe("合成 shouldReload の再利用防止", () => {
  test("遷移先が裸パスなら無条件に再実行する", ({ expect }) => {
    // 準備
    const userShouldReload = vi.fn<ShouldReloadFunction>().mockReturnValue(false);
    const { shouldReload } = createRedirectLoader({
      fullPath: "/app",
      template: "/app/dashboard",
      loader: undefined,
      shouldReload: userShouldReload,
    });

    // 実行と検証
    expect(shouldReload(reloadArgs("/app/dashboard", "/app"))).toBe(true);
    expect(userShouldReload).not.toHaveBeenCalled();
  });

  test("遷移元が裸パスなら無条件に再実行する", ({ expect }) => {
    // 準備
    const { shouldReload } = createRedirectLoader({
      fullPath: "/app",
      template: "/app/dashboard",
      loader: undefined,
      shouldReload: undefined,
    });

    // 実行と検証
    expect(shouldReload(reloadArgs("/app", "/app/dashboard"))).toBe(true);
  });

  test("裸パスが絡まない遷移では利用者の判定に委ねる", ({ expect }) => {
    // 準備
    const userShouldReload = vi.fn<ShouldReloadFunction>().mockReturnValue(false);
    const { shouldReload } = createRedirectLoader({
      fullPath: "/app",
      template: "/app/dashboard",
      loader: undefined,
      shouldReload: userShouldReload,
    });

    // 実行と検証
    expect(shouldReload(reloadArgs("/app/dashboard", "/app/projects"))).toBe(false);
    expect(userShouldReload).toHaveBeenCalledOnce();
  });

  test("利用者の判定がなければ既定値を返す", ({ expect }) => {
    // 準備
    const { shouldReload } = createRedirectLoader({
      fullPath: "/app",
      template: "/app/dashboard",
      loader: undefined,
      shouldReload: undefined,
    });

    // 実行と検証
    expect(shouldReload(reloadArgs("/app/dashboard", "/app/projects", true))).toBe(true);
    expect(shouldReload(reloadArgs("/app/dashboard", "/app/projects", false))).toBe(false);
  });
});

describe("processRoutes との統合", () => {
  test("redirect が Route に保持され loader が合成される", ({ expect }) => {
    // 準備
    const userLoader = (() => ({ ok: true })) as LoaderFunction;

    // 実行
    const routes = processRoutes([
      { path: "/app", loader: userLoader, redirect: "/app/dashboard" },
    ]);

    // 検証
    expect(routes[0]?.redirect).toBe("/app/dashboard");
    expect(routes[0]?.loader).not.toBe(userLoader);
    expect(typeof routes[0]?.loader).toBe("function");
  });

  test("宣言がなければ redirect は undefined で loader はそのまま", ({ expect }) => {
    // 準備
    const userLoader = (() => ({ ok: true })) as LoaderFunction;

    // 実行
    const routes = processRoutes([{ path: "/plain", loader: userLoader }]);

    // 検証
    expect(routes[0]?.redirect).toBeUndefined();
    expect(routes[0]?.loader).toBe(userLoader);
  });

  test("不正な宣言は正規化時にエラーを投げる", ({ expect }) => {
    expect(() => processRoutes([{ path: "/app", redirect: "" }])).toThrow();
  });

  test("children と併用できる", ({ expect }) => {
    // 実行
    const routes = processRoutes([
      {
        path: "/settings",
        redirect: "/settings/profile",
        children: [
          { path: "profile", index: true },
          { path: "security", index: true },
        ],
      },
    ]);
    const paths = routes.map((r) => r.path);

    // 検証
    expect(paths).toContain("/settings");
    expect(paths).toContain("/settings/profile");
    expect(paths).toContain("/settings/security");
    expect(routes.find((r) => r.path === "/settings")?.redirect).toBe("/settings/profile");
  });

  test("matchRoutes の結果に redirect が引き継がれる", ({ expect }) => {
    // 準備
    const routes = processRoutes([
      { path: "/settings", redirect: "/settings/profile" },
      { path: "/settings/profile", index: true },
    ]);

    // 実行
    const matched = matchRoutes(routes, url("/settings/profile"));

    // 検証
    expect(matched?.find((r) => r.path === "/settings")?.redirect).toBe("/settings/profile");
  });
});

describe("startLoaders との統合 (キャッシュ再利用の防止)", () => {
  test("裸パスで得たリダイレクトが子遷移時に再利用されない", async ({ expect, signal }) => {
    // 準備: 利用者の loader は子では通常データを返す
    const userLoader = vi.fn<LoaderFunction>().mockReturnValue({ authenticated: true });
    const routes = processRoutes([
      { path: "/app", loader: userLoader, redirect: "/app/dashboard" },
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

    // 実行2: 子への遷移ではキャッシュを使わず再実行しリダイレクトしない
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

  test("子から裸パスへの遷移では再実行してリダイレクトする", async ({ expect, signal }) => {
    // 準備
    const userLoader = vi.fn<LoaderFunction>().mockReturnValue({ ok: true });
    const routes = processRoutes([
      { path: "/app", loader: userLoader, redirect: "/app/dashboard" },
      { path: "/app/dashboard", index: true },
    ]);
    const loaderDataStore = new Map();
    const childEntry = entry("entry-1", "/app/dashboard");
    const bareEntry = entry("entry-2", "/app");

    // 実行1: 子への遷移 (キャッシュを作る)
    const first = startLoaders({
      prevRoutes: [],
      currentRoutes: matchRoutes(routes, childEntry.url)! as any,
      prevEntry: entry("entry-0", "/"),
      currentEntry: childEntry,
      loaderDataStore,
      signal,
    });
    const { redirectTo: firstRedirect } = await first.idle();
    expect(firstRedirect).toBeUndefined();

    // 実行2: 裸パスへの遷移では再実行してリダイレクトする
    const second = startLoaders({
      prevRoutes: matchRoutes(routes, childEntry.url)! as any,
      currentRoutes: matchRoutes(routes, bareEntry.url)! as any,
      prevEntry: childEntry,
      currentEntry: bareEntry,
      loaderDataStore,
      signal,
    });
    const { redirectTo: secondRedirect } = await second.idle();

    // 検証
    expect(secondRedirect).toBeInstanceOf(RedirectResponse);
    expect((secondRedirect as RedirectResponse).pathname).toBe("/app/dashboard");
  });
});

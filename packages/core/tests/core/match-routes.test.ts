import { describe, test } from "vitest";

import processRoutes from "../../src/core/_process-routes.js";
import matchRoutes from "../../src/core/match-routes.js";
import RoutePatternUtils from "../../src/core/route-pattern-utils.js";

describe("正常系の振る舞い", () => {
  test("単一のルートに完全一致したとき、要素数 1 のタプル配列になる", ({ expect }) => {
    // 準備
    const utils = new RoutePatternUtils("/about");
    const routes: any = [{ utils }];
    const url = new URL("x://y" + "/about");

    // 実行
    const result = matchRoutes(routes, url);

    // 検証
    expect(result).toStrictEqual([
      {
        utils,
        params: {},
        urlPath: "/about",
      },
    ]);
  });

  test("ネストされたルートにマッチしたとき、階層的なルートがすべて抽出された要素数 2 のタプル配列になる", ({
    expect,
  }) => {
    // 準備
    const usersUtils = new RoutePatternUtils("/users", { allowChild: true });
    const usersIdUtils = new RoutePatternUtils("/users/:id");
    const routes: any = [{ utils: usersUtils }, { utils: usersIdUtils }];
    const url = new URL("x://y" + "/users/42");

    // 実行
    const result = matchRoutes(routes, url);

    // 検証
    expect(result).toStrictEqual([
      {
        utils: usersUtils,
        params: {},
        urlPath: "/users",
      },
      {
        utils: usersIdUtils,
        params: { id: "42" },
        urlPath: "/users/42",
      },
    ]);
  });

  test("複数の動的パラメーターが存在する URL にマッチしたとき、すべてのパラメーターが抽出および埋め戻しされた要素数 1 のタプル配列になる", ({
    expect,
  }) => {
    // 準備
    const utils = new RoutePatternUtils("/blogs/:posts/comments/:commentId");
    const routes: any = [{ utils }];
    const url = new URL("x://y" + "/blogs/tech/comments/123");

    // 実行
    const result = matchRoutes(routes, url);

    // 検証
    expect(result).toStrictEqual([
      {
        utils,
        params: { posts: "tech", commentId: "123" },
        urlPath: "/blogs/tech/comments/123",
      },
    ]);
  });
});

describe("異常系および特殊ケースの振る舞い", () => {
  test("登録されているどのルートにもマッチしない URL を指定したとき、null になる", ({ expect }) => {
    // 準備
    const utils = new RoutePatternUtils("/home");
    const routes: any = [{ utils }];
    const url = new URL("x://y" + "/unknown");

    // 実行
    const result = matchRoutes(routes, url);

    // 検証
    expect(result).toBe(null);
  });

  test("ルート配列が空のとき、null になる", ({ expect }) => {
    // 準備
    const routes: any = [];
    const url = new URL("x://y" + "/home");

    // 実行
    const result = matchRoutes(routes, url);

    // 検証
    expect(result).toBe(null);
  });

  test("オプショナルパラメーターが URL 側で省略されているとき、対象のパラメーターが含まれない要素数 1 のタプル配列になる", ({
    expect,
  }) => {
    // 準備
    const utils = new RoutePatternUtils("/archive/:year?");
    const routes: any = [{ utils }];
    const url = new URL("x://y" + "/archive");

    // 実行
    const result = matchRoutes(routes, url);

    // 検証
    expect(result).toStrictEqual([
      {
        utils,
        params: {},
        urlPath: "/archive",
      },
    ]);
  });

  test("末尾スラッシュの有無を考慮しない", ({ expect }) => {
    // 準備
    const utils = new RoutePatternUtils("/settings");
    const routes: any = [{ utils }];
    const url = new URL("x://y" + "/settings/");

    // 実行
    const result = matchRoutes(routes, url);

    // 検証
    expect(result).toStrictEqual([
      {
        utils,
        params: {},
        urlPath: "/settings",
      },
    ]);
  });
});

describe("matchRoutes の拡張的な一致", () => {
  test("wildcard がフォールバックになる", ({ expect }) => {
    // 準備
    const routes = processRoutes([{ path: "/users/:id" }, { path: "/*" }]);
    const url = new URL("https://example.com/unknown/path");

    // 実行
    const matched = matchRoutes(routes, url);

    // 検証
    expect(matched).not.toBeNull();
    expect(matched!.some((r) => r.path === "/*")).toBe(true);
  });

  test("static が param より優先される", ({ expect }) => {
    // 準備
    const routes = processRoutes([{ path: "/users/:id" }, { path: "/users/me" }]);
    const url = new URL("https://example.com/users/me");

    // 実行
    const matched = matchRoutes(routes, url);

    // 検証
    expect(matched![0]!.path).toBe("/users/me");
  });

  test("階層で親と子が共にマッチする", ({ expect }) => {
    // 準備
    const routes = processRoutes([{ path: "/" }, { path: "/users" }, { path: "/users/:id" }]);
    const url = new URL("https://example.com/users/123");

    // 実行
    const matched = matchRoutes(routes, url);

    // 検証
    expect(matched).not.toBeNull();
    const paths = matched!.map((r) => r.path);
    expect(paths).toContain("/");
    expect(paths).toContain("/users");
    expect(paths).toContain("/users/:id");
  });

  test("query と hash は一致に影響しない", ({ expect }) => {
    // 準備
    const routes = processRoutes([{ path: "/search" }]);
    const url = new URL("https://example.com/search?query=1#hash");

    // 実行
    const matched = matchRoutes(routes, url);

    // 検証
    expect(matched).not.toBeNull();
    expect(matched![0]!.path).toBe("/search");
  });

  test("存在しないパスは null を返す", ({ expect }) => {
    // 準備
    const routes = processRoutes([{ path: "/exists" }]);
    const url = new URL("https://example.com/notfound");

    // 実行と検証
    expect(matchRoutes(routes, url)).toBeNull();
  });

  test("urlPath と params が正しく解決される", ({ expect }) => {
    // 準備
    const routes = processRoutes([{ path: "/users/:id" }]);
    const url = new URL("https://example.com/users/42");

    // 実行
    const matched = matchRoutes(routes, url);

    // 検証
    expect(matched![0]!.urlPath).toBe("/users/42");
    expect(matched![0]!.params).toStrictEqual({ id: "42" });
  });

  test("順序が異なっても詳細度順で安定する", ({ expect }) => {
    // 準備
    const routesA = processRoutes([{ path: "/*" }, { path: "/a" }, { path: "/a/:id" }]);
    const routesB = processRoutes([{ path: "/a/:id" }, { path: "/*" }, { path: "/a" }]);
    const url = new URL("https://example.com/a");

    // 検証
    expect(matchRoutes(routesA, url)![0]!.path).toBe("/a");
    expect(matchRoutes(routesB, url)![0]!.path).toBe("/a");
  });
});

import { describe, test } from "vitest";

import processRoutes from "../../src/core/_process-routes.js";
import matchRoutes from "../../src/core/match-routes.js";

function matchedPaths(paths: readonly string[], url: string): string[] {
  const routes = processRoutes(paths.map((path) => ({ path })));
  const matched = matchRoutes(routes, new URL("https://example.com" + url));
  return matched?.map((r) => r.path) ?? [];
}

describe("static と param の兄弟競合 (issue 005)", () => {
  test("static 完全一致があるとき同階層の param はマッチ鎖から除外される", ({ expect }) => {
    // 準備: saas-project の /app/projects/new と /app/projects/:projectId の縮小形
    const paths = matchedPaths(
      ["/app", "/app/projects/new", "/app/projects/:projectId"],
      "/app/projects/new",
    );

    // 検証
    expect(paths).toContain("/app/projects/new");
    expect(paths).not.toContain("/app/projects/:projectId");
  });

  test("正当な親レイアウト (/app) は除外されない", ({ expect }) => {
    // 準備
    const paths = matchedPaths(
      ["/app", "/app/projects/new", "/app/projects/:projectId"],
      "/app/projects/new",
    );

    // 検証
    expect(paths).toContain("/app");
  });

  test("ワイルドカード (/*) とルート (/) は保持される", ({ expect }) => {
    // 準備
    const paths = matchedPaths(
      ["/", "/app", "/app/projects/new", "/app/projects/:projectId", "/*"],
      "/app/projects/new",
    );

    // 検証
    expect(paths).toContain("/");
    expect(paths).toContain("/*");
    expect(paths).not.toContain("/app/projects/:projectId");
  });

  test("static 競合がない URL では param が残る", ({ expect }) => {
    // 準備と実行
    const detail = matchedPaths(
      ["/app", "/app/projects/new", "/app/projects/:projectId"],
      "/app/projects/123",
    );

    // 検証: param layout が残り、static はそもそもマッチしない
    expect(detail).toContain("/app/projects/:projectId");
    expect(detail).not.toContain("/app/projects/new");
    expect(detail).toContain("/app");
  });

  test("param の子ページでは param の親子が共に残る", ({ expect }) => {
    // 準備と実行
    const paths = matchedPaths(
      ["/app", "/app/projects/new", "/app/projects/:projectId", "/app/projects/:projectId/tasks"],
      "/app/projects/123/tasks",
    );

    // 検証
    expect(paths).toContain("/app/projects/:projectId/tasks");
    expect(paths).toContain("/app/projects/:projectId");
    expect(paths).toContain("/app");
  });

  test("static 枝の下層では param の祖先が除外される", ({ expect }) => {
    // 準備: static layout (非 index・前方一致) + static 葉 vs param layout
    const routes = processRoutes([
      { path: "/app/projects/new" },
      { path: "/app/projects/new/details", index: true },
      { path: "/app/projects/:projectId" },
    ]);
    const matched = matchRoutes(routes, new URL("https://example.com/app/projects/new/details"));
    const paths = matched?.map((r) => r.path) ?? [];

    // 検証
    expect(paths).toContain("/app/projects/new/details");
    expect(paths).toContain("/app/projects/new");
    expect(paths).not.toContain("/app/projects/:projectId");
  });

  test("children 展開後のパスでも static 優先が働く", ({ expect }) => {
    // 準備: 004 の children 記法で static 枝と param 枝を宣言
    const routes = processRoutes([
      {
        path: "/app/projects",
        children: [
          { path: "new", index: true },
          {
            path: ":projectId",
            children: [{ path: "tasks", index: true }],
          },
        ],
      },
    ]);
    const staticMatched = matchRoutes(
      routes,
      new URL("https://example.com/app/projects/new"),
    )?.map((r) => r.path);
    const paramMatched = matchRoutes(
      routes,
      new URL("https://example.com/app/projects/123/tasks"),
    )?.map((r) => r.path);

    // 検証
    expect(staticMatched).toContain("/app/projects/new");
    expect(staticMatched).not.toContain("/app/projects/:projectId");
    expect(paramMatched).toContain("/app/projects/:projectId/tasks");
    expect(paramMatched).toContain("/app/projects/:projectId");
  });

  test("定義順を入れ替えても static 優先は変わらない", ({ expect }) => {
    // 準備: param を先に定義しても processRoutes のソート + フィルタで解決する
    const routes = processRoutes([{ path: "/users/:id" }, { path: "/users/me" }]);
    const matched = matchRoutes(routes, new URL("https://example.com/users/me"));
    const paths = matched?.map((r) => r.path) ?? [];

    // 検証
    expect(paths).toStrictEqual(["/users/me"]);
  });
});

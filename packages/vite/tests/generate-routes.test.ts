import { test } from "vitest";

import generateRoutesModule from "../src/_generate-routes.js";
import type { RouteNode } from "../src/_scan-routes.js";

/**
 * テスト用のルートノードを作成します。
 */
function createNode(partial: Partial<RouteNode> & { modulePath: string }): RouteNode {
  return {
    path: "/",
    index: false,
    children: [],
    ...partial,
  };
}

test("空のルート配列から空の定義を生成する", ({ expect }) => {
  // 実行
  const code = generateRoutesModule({ root: "/project", nodes: [] });

  // 検証
  expect(code).toContain("export const routes = [];");
  expect(code).toContain("export default routes;");
});

test("プロジェクトルートの外にあるモジュールはファイルシステム経由で参照する", ({ expect }) => {
  // 準備
  const nodes = [
    createNode({ path: "/", index: true, modulePath: "/project/src/pages/_index.tsx" }),
    createNode({ path: "/shared", index: false, modulePath: "/shared/pages/widget.tsx" }),
  ];

  // 実行
  const code = generateRoutesModule({ root: "/project", nodes });

  // 検証
  expect(code).toContain('import * as _pera1_route_0 from "/src/pages/_index.tsx";');
  expect(code).toContain('import * as _pera1_route_1 from "/@fs//shared/pages/widget.tsx";');
});

test("同じモジュールを参照するルートは識別子を共有する", ({ expect }) => {
  // 準備
  const nodes = [
    createNode({ path: "/a", index: false, modulePath: "/project/src/pages/a.tsx" }),
    createNode({ path: "/b", index: false, modulePath: "/project/src/pages/a.tsx" }),
  ];

  // 実行
  const code = generateRoutesModule({ root: "/project", nodes });

  // 検証
  expect(code.match(/import \* as _pera1_route_0/g)).toHaveLength(1);
  expect(code).toContain("..._pera1_route_0,");
});

test("子ルートを持つレイアウトを階層として生成する", ({ expect }) => {
  // 準備
  const nodes = [
    createNode({
      path: "/",
      index: false,
      modulePath: "/project/src/pages/_layout.tsx",
      children: [
        createNode({ path: "/", index: true, modulePath: "/project/src/pages/_index.tsx" }),
      ],
    }),
  ];

  // 実行
  const code = generateRoutesModule({ root: "/project", nodes });

  // 検証
  expect(code).toContain("children: [");
  expect(code).toContain("index: true,");
});

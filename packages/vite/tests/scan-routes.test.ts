import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { onTestFinished, test } from "vitest";

import { defaultExclude, defaultInclude } from "../src/_options.js";
import scanRoutes, { type RouteNode } from "../src/_scan-routes.js";

const fixtureRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "fixtures", "basic");
const fixturePages = path.join(fixtureRoot, "src", "pages");

/**
 * ルートノードを、検証しやすい形へ単純化します。
 *
 * ページモジュールの絶対パスを、フィクスチャーのページディレクトリーからの相対パスへ置き換えます。
 */
function simplify(nodes: readonly RouteNode[]): readonly object[] {
  return nodes.map((node) => ({
    path: node.path,
    index: node.index,
    file: path.relative(fixturePages, node.modulePath),
    children: simplify(node.children),
  }));
}

/**
 * 一時ディレクトリーにページ構成を作成し、そのルートを返します。
 *
 * テスト終了時に自動で削除されます。
 */
function createPages(files: Readonly<Record<string, string>>): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "pera1-vite-"));
  onTestFinished(() => fs.rmSync(root, { recursive: true, force: true }));

  for (const [relativePath, content] of Object.entries(files)) {
    const filePath = path.join(root, "pages", relativePath);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, content);
  }

  return root;
}

test("ファイル構成からルートのツリーを生成する", ({ expect }) => {
  // 実行
  const result = scanRoutes({
    root: fixtureRoot,
    dir: "src/pages",
    include: defaultInclude,
    exclude: defaultExclude,
  });

  // 検証
  expect(simplify(result)).toStrictEqual([
    {
      path: "/",
      index: false,
      file: "_layout.ts",
      children: [
        { path: "/", index: true, file: "_index.ts", children: [] },
        { path: "/about", index: false, file: "about.ts", children: [] },
        { path: "/sitemap.xml", index: false, file: "sitemap[.]xml.ts", children: [] },
        { path: "/login", index: false, file: "_auth/login.ts", children: [] },
        { path: "/signup", index: false, file: "_auth/signup.ts", children: [] },
        {
          path: "/blog",
          index: false,
          file: "blog/_layout.ts",
          children: [
            { path: "/blog", index: true, file: "blog/_index.ts", children: [] },
            { path: "/blog/*", index: false, file: "blog/$.ts", children: [] },
            { path: "/blog/:postId", index: false, file: "blog/$postId.ts", children: [] },
          ],
        },
      ],
    },
  ]);
});

test("_layout がないディレクトリーのルートは親の子へ引き上げられる", ({ expect }) => {
  // 準備
  const root = createPages({
    "_index.ts": "export default 1;",
    "about.ts": "export default 1;",
  });

  // 実行
  const result = scanRoutes({
    root,
    dir: "pages",
    include: defaultInclude,
    exclude: defaultExclude,
  });

  // 検証
  expect(result.map((node) => node.path)).toStrictEqual(["/", "/about"]);
});

test("include で対象のファイルを絞り込める", ({ expect }) => {
  // 準備
  const root = createPages({
    "about.tsx": "export default 1;",
    "about.ts": "export default 1;",
  });

  // 実行
  const result = scanRoutes({
    root,
    dir: "pages",
    include: ["**/*.tsx"],
    exclude: defaultExclude,
  });

  // 検証
  expect(result.map((node) => path.basename(node.modulePath))).toStrictEqual(["about.tsx"]);
});

test("exclude が include より優先される", ({ expect }) => {
  // 準備
  const root = createPages({
    "about.tsx": "export default 1;",
    "about.test.tsx": "export default 1;",
    "_components/button.tsx": "export default 1;",
  });

  // 実行
  const result = scanRoutes({
    root,
    dir: "pages",
    include: ["**/*.tsx"],
    exclude: ["**/*.test.tsx", "_components"],
  });

  // 検証
  expect(result.map((node) => node.path)).toStrictEqual(["/about"]);
});

test("インデックスルートが重複しているとエラーになる", ({ expect }) => {
  // 準備
  const root = createPages({
    "_index.ts": "export default 1;",
    "_index.tsx": "export default 1;",
  });

  // 実行と検証
  expect(() =>
    scanRoutes({ root, dir: "pages", include: defaultInclude, exclude: defaultExclude }),
  ).toThrow("インデックスルートが重複しています");
});

test("レイアウトルートが重複しているとエラーになる", ({ expect }) => {
  // 準備
  const root = createPages({
    "_layout.ts": "export default 1;",
    "_layout.tsx": "export default 1;",
  });

  // 実行と検証
  expect(() =>
    scanRoutes({ root, dir: "pages", include: defaultInclude, exclude: defaultExclude }),
  ).toThrow("レイアウトルートが重複しています");
});

test("同じパスになるルートが重複しているとエラーになる", ({ expect }) => {
  // 準備
  const root = createPages({
    "about.ts": "export default 1;",
    "about.jsx": "export default 1;",
  });

  // 実行と検証
  expect(() =>
    scanRoutes({ root, dir: "pages", include: defaultInclude, exclude: defaultExclude }),
  ).toThrow("同じパスになるルートが重複しています");
});

test("_index と _layout 以外の _ で始まるファイルはエラーになる", ({ expect }) => {
  // 準備
  const root = createPages({ "_partial.ts": "export default 1;" });

  // 実行と検証
  expect(() =>
    scanRoutes({ root, dir: "pages", include: defaultInclude, exclude: defaultExclude }),
  ).toThrow("ルートとして解釈できないファイルです");
});

test("パスレスディレクトリーに _layout を置くとエラーになる", ({ expect }) => {
  // 準備
  const root = createPages({
    "_auth/_layout.ts": "export default 1;",
    "_auth/login.ts": "export default 1;",
  });

  // 実行と検証
  expect(() =>
    scanRoutes({ root, dir: "pages", include: defaultInclude, exclude: defaultExclude }),
  ).toThrow("パスレスディレクトリーには _layout を置けません");
});

test("ページディレクトリーが存在しないとエラーになる", ({ expect }) => {
  // 準備
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "pera1-vite-"));
  onTestFinished(() => fs.rmSync(root, { recursive: true, force: true }));

  // 実行と検証
  expect(() =>
    scanRoutes({ root, dir: "pages", include: defaultInclude, exclude: defaultExclude }),
  ).toThrow("ルートディレクトリーが見つかりません");
});

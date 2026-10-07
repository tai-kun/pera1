import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { build, createServer, type ViteDevServer } from "vite";
import { onTestFinished, test, vi } from "vitest";

import pera1, { virtualRoutesId } from "../src/index.js";
import { createTempProject } from "./_temp-project.js";

const fixtureRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "fixtures", "basic");

/**
 * リポジトリーを汚さないよう、ルート型の生成先となる一時ディレクトリーを作成します。
 */
function createTypesDirectory(): string {
  const typesDir = fs.mkdtempSync(path.join(os.tmpdir(), "pera1-vite-types-"));
  onTestFinished(() => fs.rmSync(typesDir, { recursive: true, force: true }));

  return typesDir;
}

/**
 * フィクスチャーをルートとして、@pera1/vite を適用した開発サーバーを作成します。
 */
async function createFixtureServer(): Promise<ViteDevServer> {
  return createServer({
    root: fixtureRoot,
    logLevel: "silent",
    plugins: [pera1({ typesDir: createTypesDirectory() })],
    appType: "custom",
    server: { middlewareMode: true },
  });
}

/**
 * ビルド結果に含まれるすべてのチャンクのコードを連結して返します。
 */
function collectCode(result: Awaited<ReturnType<typeof build>>): string {
  const outputs = Array.isArray(result) ? result : [result];
  const codes: string[] = [];

  for (const output of outputs) {
    if (!("output" in output)) {
      continue;
    }

    for (const item of output.output) {
      if (item.type === "chunk") {
        codes.push(item.code);
      }
    }
  }

  return codes.join("\n");
}

test("仮想モジュール ID を解決する", async ({ expect }) => {
  // 準備
  const server = await createFixtureServer();

  try {
    // 実行
    const result = await server.pluginContainer.resolveId(virtualRoutesId);

    // 検証
    expect(result?.id).toBe(`\0${virtualRoutesId}`);
  } finally {
    await server.close();
  }
});

test("開発サーバーが仮想モジュールからルート定義を配信する", async ({ expect }) => {
  // 準備
  const server = await createFixtureServer();

  try {
    // 実行
    const result = await server.transformRequest(virtualRoutesId);
    const code = result?.code ?? "";

    // 検証
    expect(code).toContain("export const routes =");
    expect(code).toContain('import * as _pera1_route_0 from "/src/pages/_layout.ts"');
    expect(code).toContain("..._pera1_route_0");
    expect(code).toContain('path: "/blog/:postId"');
    expect(code).toContain('path: "/blog/*"');
    expect(code).toContain("index: true");
  } finally {
    await server.close();
  }
});

test("本番ビルドが警告なくルート定義をバンドルする", async ({ expect }) => {
  // 準備
  const warnings: string[] = [];

  // 実行
  const result = await build({
    root: fixtureRoot,
    logLevel: "silent",
    plugins: [pera1({ typesDir: createTypesDirectory() })],
    build: {
      write: false,
      lib: {
        entry: path.join(fixtureRoot, "src", "main.ts"),
        formats: ["es"],
        fileName: "main",
      },
      rollupOptions: {
        onwarn(warning) {
          warnings.push(warning.message);
        },
      },
    },
  });
  const code = collectCode(result);

  // 検証
  expect(warnings).toStrictEqual([]);
  expect(code).toContain("/blog/:postId");
  expect(code).toContain("/sitemap.xml");
});

test("ページファイルの追加で仮想モジュールを無効化して再読み込みする", async ({ expect }) => {
  // 準備
  const server = await createFixtureServer();

  try {
    await server.transformRequest(virtualRoutesId);
    const send = vi.spyOn(server.ws, "send").mockImplementation(() => {});
    const invalidate = vi.spyOn(server.moduleGraph, "invalidateModule");

    // 実行
    server.watcher.emit("add", path.join(fixtureRoot, "src", "pages", "new-page.ts"));

    // 検証
    expect(invalidate).toHaveBeenCalledOnce();
    expect(send).toHaveBeenCalledWith({ type: "full-reload" });

    // ページディレクトリーの外の追加では何もしないことを検証します。
    server.watcher.emit("add", path.join(fixtureRoot, "src", "other.ts"));
    expect(send).toHaveBeenCalledOnce();
  } finally {
    await server.close();
  }
});

test("開発サーバーの起動時とファイル追加時にルート型を生成する", async ({ expect }) => {
  // 準備
  const root = createTempProject({ "src/pages/_index.tsx": "export default 1;" });
  const server = await createServer({
    root,
    logLevel: "silent",
    plugins: [pera1()],
    appType: "custom",
    server: { middlewareMode: true },
  });

  try {
    // 検証: 起動時に型が生成されます。
    expect(fs.existsSync(path.join(root, ".pera1/types/src/pages/+types/_index.d.ts"))).toBe(true);

    // 実行: ルートファイルを追加します。
    const addedFile = path.join(root, "src", "pages", "about.tsx");
    fs.writeFileSync(addedFile, "export default 1;");
    server.watcher.emit("add", addedFile);

    // 検証: 追加されたルートの型が生成されます。
    expect(fs.existsSync(path.join(root, ".pera1/types/src/pages/+types/about.d.ts"))).toBe(true);
  } finally {
    await server.close();
  }
});

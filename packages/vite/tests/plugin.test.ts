import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { build, createServer, type ViteDevServer } from "vite";
import { onTestFinished, test, vi } from "vitest";

import pera1, { VIRTUAL_ROUTES_ID } from "../src/index.js";
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
    const result = await server.pluginContainer.resolveId(VIRTUAL_ROUTES_ID);

    // 検証
    expect(result?.id).toBe(`\0${VIRTUAL_ROUTES_ID}`);
  } finally {
    await server.close();
  }
});

test("開発サーバーが仮想モジュールからルート定義を配信する", async ({ expect }) => {
  // 準備
  const server = await createFixtureServer();

  try {
    // 実行
    const result = await server.transformRequest(VIRTUAL_ROUTES_ID);
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
    await server.transformRequest(VIRTUAL_ROUTES_ID);
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

test("ファイル変更では再読み込みせず型だけ再生成する", async ({ expect }) => {
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
    const send = vi.spyOn(server.ws, "send").mockImplementation(() => {});
    const invalidate = vi.spyOn(server.moduleGraph, "invalidateModule");

    // 実行: 変更イベントでは再読み込みしません。
    const changedFile = path.join(root, "src", "pages", "about.tsx");
    fs.writeFileSync(changedFile, "export default 1;");
    server.watcher.emit("change", changedFile);

    // 検証
    expect(fs.existsSync(path.join(root, ".pera1/types/src/pages/+types/about.d.ts"))).toBe(true);
    expect(invalidate).not.toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
  } finally {
    await server.close();
  }
});

test("モジュールが未解決の追加では無効化せず再読み込みする", async ({ expect }) => {
  // 準備
  const server = await createFixtureServer();

  try {
    const send = vi.spyOn(server.ws, "send").mockImplementation(() => {});
    const invalidate = vi.spyOn(server.moduleGraph, "invalidateModule");

    // 実行: 仮想モジュールを未取得のまま追加イベントを受けます。
    server.watcher.emit("add", path.join(fixtureRoot, "src", "pages", "fresh.ts"));

    // 検証
    expect(invalidate).not.toHaveBeenCalled();
    expect(send).toHaveBeenCalledWith({ type: "full-reload" });
  } finally {
    await server.close();
  }
});

test("ファイル削除で仮想モジュールを無効化して再読み込みする", async ({ expect }) => {
  // 準備
  const server = await createFixtureServer();

  try {
    await server.transformRequest(VIRTUAL_ROUTES_ID);
    const send = vi.spyOn(server.ws, "send").mockImplementation(() => {});
    const invalidate = vi.spyOn(server.moduleGraph, "invalidateModule");

    // 実行
    server.watcher.emit("unlink", path.join(fixtureRoot, "src", "pages", "gone.ts"));

    // 検証
    expect(invalidate).toHaveBeenCalledOnce();
    expect(send).toHaveBeenCalledWith({ type: "full-reload" });
  } finally {
    await server.close();
  }
});

test("ビルド監視フックがページファイルの変更で型を再生成する", async ({ expect }) => {
  // 準備
  const root = createTempProject({ "src/pages/_index.tsx": "export default 1;" });
  const plugin = pera1();
  const warnings: string[] = [];
  const hooks = plugin as unknown as {
    configResolved: (config: { root: string; command: "build" | "serve" }) => void;
    buildStart: (this: { warn: (message: string) => void }) => void;
    watchChange: (this: { warn: (message: string) => void }, id: string) => void;
  };
  hooks.configResolved({ root, command: "build" });

  // 実行: ビルド開始時は警告がなければ何も通知しません。
  hooks.buildStart.call({ warn: (message) => warnings.push(message) });

  // 検証
  expect(warnings).toStrictEqual([]);
  expect(fs.existsSync(path.join(root, ".pera1/types/src/pages/+types/_index.d.ts"))).toBe(true);

  // 実行: ページディレクトリーの外の変更では何もしません。
  hooks.watchChange.call(
    { warn: (message) => warnings.push(message) },
    path.join(root, "other.ts"),
  );

  // 検証
  expect(warnings).toStrictEqual([]);

  // 実行: ページファイルの変更で型を再生成します。
  const addedFile = path.join(root, "src", "pages", "about.tsx");
  fs.writeFileSync(addedFile, "export default 1;");
  hooks.watchChange.call({ warn: (message) => warnings.push(message) }, addedFile);

  // 検証
  expect(warnings).toStrictEqual([]);
  expect(fs.existsSync(path.join(root, ".pera1/types/src/pages/+types/about.d.ts"))).toBe(true);
});

test("ビルド開始フックの警告を通知する", async ({ expect }) => {
  // 準備: プロジェクトルートの外にページディレクトリーを置きます。
  const projectRoot = createTempProject({ "shared/pages/_index.tsx": "export default 1;" });
  const root = path.join(projectRoot, "app");
  fs.mkdirSync(path.join(root, "src", "pages"), { recursive: true });
  const plugin = pera1({ dir: "../shared/pages" });
  const hooks = plugin as unknown as {
    configResolved: (config: { root: string; command: "build" | "serve" }) => void;
    buildStart: (this: { warn: (message: string) => void }) => void;
  };
  hooks.configResolved({ root, command: "build" });
  const warnings: string[] = [];

  // 実行
  hooks.buildStart.call({
    warn: (message) => {
      warnings.push(message);
    },
  });

  // 検証
  expect(warnings).toHaveLength(1);
});

test("ビルド監視フックの警告を通知する", async ({ expect }) => {
  // 準備
  const projectRoot = createTempProject({ "shared/pages/_index.tsx": "export default 1;" });
  const root = path.join(projectRoot, "app");
  fs.mkdirSync(path.join(root, "src", "pages"), { recursive: true });
  const plugin = pera1({ dir: "../shared/pages" });
  const hooks = plugin as unknown as {
    configResolved: (config: { root: string; command: "build" | "serve" }) => void;
    watchChange: (this: { warn: (message: string) => void }, id: string) => void;
  };
  hooks.configResolved({ root, command: "build" });
  const warnings: string[] = [];

  // 実行
  hooks.watchChange.call(
    {
      warn: (message) => {
        warnings.push(message);
      },
    },
    path.join(projectRoot, "shared", "pages", "_index.tsx"),
  );

  // 検証
  expect(warnings).toHaveLength(1);
});

test("ビルド開始フックの失敗を通知する", async ({ expect }) => {
  // 準備: ページディレクトリーがないため生成に失敗します。
  const root = createTempProject({});
  const plugin = pera1();
  const hooks = plugin as unknown as {
    configResolved: (config: { root: string; command: "build" | "serve" }) => void;
    buildStart: (this: { warn: (message: string) => void }) => void;
  };
  hooks.configResolved({ root, command: "build" });
  const warnings: string[] = [];

  // 実行
  hooks.buildStart.call({
    warn: (message) => {
      warnings.push(message);
    },
  });

  // 検証
  expect(warnings.join("")).toContain("ルート型の生成に失敗しました");
});

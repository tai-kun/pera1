import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { test } from "vitest";

import run, { type CliIo } from "../src/_cli.js";
import generateTypes from "../src/_generate-types.js";
import { defaultExclude, defaultInclude } from "../src/_options.js";
import { createTempProject } from "./_temp-project.js";

/**
 * ビルド済みのパッケージエントリーです。vite.config の読み込みテストで使います。
 */
const builtEntry = fileURLToPath(new URL("../dist/src/index.js", import.meta.url));

/**
 * 出力を配列へ集めるテスト用の CLI 入出力を作成します。
 */
function createCliIo(messages: string[], errors: string[]): CliIo {
  return {
    cwd: process.cwd(),
    write: (message: string) => {
      messages.push(message);
    },
    writeError: (message: string) => {
      errors.push(message);
    },
  };
}

test("ルートファイルに対応する型を生成する", ({ expect }) => {
  // 準備
  const root = createTempProject({
    "src/pages/_index.tsx": "export default 1;",
    "src/pages/contacts/$id.tsx": "export default 1;",
  });

  // 実行
  const result = generateTypes({
    root,
    dir: "src/pages",
    typesDir: ".pera1/types",
    include: defaultInclude,
    exclude: defaultExclude,
  });

  // 検証
  expect(result.written).toStrictEqual([
    path.join(root, ".pera1/types/src/pages/+types/_index.d.ts"),
    path.join(root, ".pera1/types/src/pages/contacts/+types/$id.d.ts"),
  ]);
  expect(result.removed).toStrictEqual([]);
  expect(result.warnings).toStrictEqual([]);

  const content = fs.readFileSync(
    path.join(root, ".pera1/types/src/pages/contacts/+types/$id.d.ts"),
    "utf8",
  );
  expect(content).toContain('} from "@pera1/vite";');
  expect(content).toContain('export type Path = "/contacts/:id";');
  expect(content).toContain("export type Params = RouteParams<Path>;");
  expect(content).toContain("export type LoaderArgs = LoaderFunctionArgs<Path>;");
  expect(content).toContain("export type ActionArgs = ActionFunctionArgs<Path>;");
  expect(content).toContain("export type ShouldReloadArgs = ShouldReloadFunctionArgs<Path>;");
});

test("生成ルートに自身を git 管理対象外にする .gitignore を出力する", ({ expect }) => {
  // 準備
  const root = createTempProject({ "src/pages/_index.tsx": "export default 1;" });

  // 実行
  generateTypes({
    root,
    dir: "src/pages",
    typesDir: ".pera1/types",
    include: defaultInclude,
    exclude: defaultExclude,
  });

  // 検証
  expect(fs.readFileSync(path.join(root, ".pera1/.gitignore"), "utf8")).toBe("*\n");
});

test("内容が変わっていなければ型を書き換えない", ({ expect }) => {
  // 準備
  const root = createTempProject({ "src/pages/_index.tsx": "export default 1;" });
  const args = {
    root,
    dir: "src/pages",
    typesDir: ".pera1/types",
    include: defaultInclude,
    exclude: defaultExclude,
  };
  generateTypes(args);

  // 実行
  const result = generateTypes(args);

  // 検証
  expect(result.written).toStrictEqual([]);
  expect(result.removed).toStrictEqual([]);
});

test("ルートファイルがなくなった型を削除する", ({ expect }) => {
  // 準備
  const root = createTempProject({
    "src/pages/_index.tsx": "export default 1;",
    "src/pages/about.tsx": "export default 1;",
  });
  generateTypes({
    root,
    dir: "src/pages",
    typesDir: ".pera1/types",
    include: defaultInclude,
    exclude: defaultExclude,
  });
  const removedFile = path.join(root, ".pera1/types/src/pages/+types/about.d.ts");
  fs.rmSync(path.join(root, "src/pages/about.tsx"));

  // 実行
  const result = generateTypes({
    root,
    dir: "src/pages",
    typesDir: ".pera1/types",
    include: defaultInclude,
    exclude: defaultExclude,
  });

  // 検証
  expect(result.removed).toStrictEqual([removedFile]);
  expect(fs.existsSync(removedFile)).toBe(false);
});

test("プロジェクトルートの外にあるルートファイルは警告してスキップする", ({ expect }) => {
  // 準備
  const projectRoot = createTempProject({ "shared/pages/_index.tsx": "export default 1;" });
  const root = path.join(projectRoot, "app");
  fs.mkdirSync(root, { recursive: true });

  // 実行
  const result = generateTypes({
    root,
    dir: "../shared/pages",
    typesDir: ".pera1/types",
    include: defaultInclude,
    exclude: defaultExclude,
  });

  // 検証
  expect(result.warnings).toHaveLength(1);
  expect(result.written).toStrictEqual([]);
});

test("CLI でルート型を生成する", async ({ expect }) => {
  // 準備
  const root = createTempProject({ "src/pages/_index.tsx": "export default 1;" });
  const messages: string[] = [];
  const errors: string[] = [];

  // 実行
  const code = await run(["typegen", "--root", root], createCliIo(messages, errors));

  // 検証
  expect(code).toBe(0);
  expect(errors).toStrictEqual([]);
  expect(messages.join("")).toContain("ルート型を生成しました");
  expect(fs.existsSync(path.join(root, ".pera1/types/src/pages/+types/_index.d.ts"))).toBe(true);
});

test("CLI でページディレクトリーと生成先を指定できる", async ({ expect }) => {
  // 準備
  const root = createTempProject({ "app/routes/about.tsx": "export default 1;" });
  const messages: string[] = [];
  const errors: string[] = [];

  // 実行
  const code = await run(
    ["typegen", "--root", root, "--dir", "app/routes", "--out", ".types"],
    createCliIo(messages, errors),
  );

  // 検証
  expect(code).toBe(0);
  expect(fs.existsSync(path.join(root, ".types/app/routes/+types/about.d.ts"))).toBe(true);
});

test("CLI で include と exclude を指定できる", async ({ expect }) => {
  // 準備
  const root = createTempProject({
    "src/pages/about.tsx": "export default 1;",
    "src/pages/about.test.tsx": "export default 1;",
  });
  const messages: string[] = [];
  const errors: string[] = [];

  // 実行
  const code = await run(
    ["typegen", "--root", root, "--include", "**/*.tsx", "--exclude", "**/*.test.tsx"],
    createCliIo(messages, errors),
  );

  // 検証
  expect(code).toBe(0);
  expect(fs.existsSync(path.join(root, ".pera1/types/src/pages/+types/about.d.ts"))).toBe(true);
  expect(fs.existsSync(path.join(root, ".pera1/types/src/pages/+types/about.test.d.ts"))).toBe(
    false,
  );
});

test("CLI は不明なコマンドで失敗する", async ({ expect }) => {
  // 準備
  const messages: string[] = [];
  const errors: string[] = [];

  // 実行
  const code = await run(["unknown"], createCliIo(messages, errors));

  // 検証
  expect(code).toBe(1);
  expect(errors.join("")).toContain("不明なコマンドです");
});

test.skipIf(!fs.existsSync(builtEntry))(
  "CLI が vite.config のプラグインオプションを読み取る",
  async ({ expect }) => {
    // 準備
    const root = createTempProject({
      "vite.config.ts": [
        `import pera1 from ${JSON.stringify(builtEntry)};`,
        'export default { plugins: [pera1({ dir: "app/routes", include: ["**/*.tsx"], typesDir: ".custom/types" })] };',
        "",
      ].join("\n"),
      "app/routes/_index.tsx": "export default 1;",
      "app/routes/ignored.ts": "export default 1;",
    });
    const messages: string[] = [];
    const errors: string[] = [];

    // 実行
    const code = await run(["typegen", "--root", root], createCliIo(messages, errors));

    // 検証
    expect(code).toBe(0);
    expect(errors).toStrictEqual([]);
    expect(fs.existsSync(path.join(root, ".custom/types/app/routes/+types/_index.d.ts"))).toBe(
      true,
    );
    expect(fs.existsSync(path.join(root, ".custom/types/app/routes/+types/ignored.d.ts"))).toBe(
      false,
    );
    expect(fs.readFileSync(path.join(root, ".custom/.gitignore"), "utf8")).toBe("*\n");
  },
);

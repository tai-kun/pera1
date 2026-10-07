import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { test } from "vitest";

import run, { type CliIo } from "../src/_cli.js";
import { createTempProject } from "./_temp-project.js";

/**
 * ビルド済みのパッケージエントリーです。
 * `vite.config` の読み込みテストで使います。
 */
const builtEntry = fileURLToPath(new URL("../dist/src/index.js", import.meta.url));

/**
 * 出力を配列へ集めるテスト用の CLI 入出力を作成します。
 */
function createCliIo(root: string, messages: string[], errors: string[]): CliIo {
  return {
    cwd: root,
    write: (message: string) => {
      messages.push(message);
    },
    writeError: (message: string) => {
      errors.push(message);
    },
  };
}

test("CLI は不正なオプションで失敗する", async ({ expect }) => {
  // 準備
  const root = createTempProject({});
  const messages: string[] = [];
  const errors: string[] = [];

  // 実行
  const code = await run(["--unknown-option"], createCliIo(root, messages, errors));

  // 検証
  expect(code).toBe(1);
  expect(errors.join("")).toContain("pera1-vite");
});

test("CLI はヘルプを表示する", async ({ expect }) => {
  // 準備
  const root = createTempProject({});
  const messages: string[] = [];
  const errors: string[] = [];

  // 実行
  const helpCode = await run(["--help"], createCliIo(root, messages, errors));
  const shortCode = await run(["-h"], createCliIo(root, messages, errors));

  // 検証
  expect(helpCode).toBe(0);
  expect(shortCode).toBe(0);
  expect(messages.join("")).toContain("使い方:");
});

test("CLI はコマンドがないと失敗する", async ({ expect }) => {
  // 準備
  const root = createTempProject({});
  const messages: string[] = [];
  const errors: string[] = [];

  // 実行
  const code = await run([], createCliIo(root, messages, errors));

  // 検証
  expect(code).toBe(1);
  expect(errors.join("")).toContain("使い方:");
});

test("CLI はtypegenへの余分な引数で失敗する", async ({ expect }) => {
  // 準備
  const root = createTempProject({ "src/pages/_index.tsx": "export default 1;" });
  const messages: string[] = [];
  const errors: string[] = [];

  // 実行
  const code = await run(["typegen", "extra"], createCliIo(root, messages, errors));

  // 検証
  expect(code).toBe(1);
  expect(errors.join("")).toContain("typegen に引数は指定できません");
});

test("CLI はカレントディレクトリーを起点に生成できる", async ({ expect }) => {
  // 準備
  const root = createTempProject({ "src/pages/_index.tsx": "export default 1;" });
  const messages: string[] = [];
  const errors: string[] = [];

  // 実行 (--root を省略し、io.cwd を起点にします)
  const code = await run(["typegen"], createCliIo(root, messages, errors));

  // 検証
  expect(code).toBe(0);
  expect(fs.existsSync(path.join(root, ".pera1/types/src/pages/+types/_index.d.ts"))).toBe(true);
});

test("CLI は警告を標準エラー出力に書き出す", async ({ expect }) => {
  // 準備
  const projectRoot = createTempProject({ "shared/pages/_index.tsx": "export default 1;" });
  const root = path.join(projectRoot, "app");
  fs.mkdirSync(root, { recursive: true });
  const messages: string[] = [];
  const errors: string[] = [];

  // 実行
  const code = await run(
    ["typegen", "--root", root, "--dir", "../shared/pages"],
    createCliIo(root, messages, errors),
  );

  // 検証
  expect(code).toBe(0);
  expect(errors.join("")).toContain("警告:");
});

test("CLI は生成に失敗すると終了コード1を返す", async ({ expect }) => {
  // 準備
  const root = createTempProject({});
  const messages: string[] = [];
  const errors: string[] = [];

  // 実行 (ページディレクトリーがないため生成に失敗します)
  const code = await run(["typegen", "--root", root], createCliIo(root, messages, errors));

  // 検証
  expect(code).toBe(1);
  expect(errors.join("")).toContain("ルート型の生成に失敗しました");
});

test("CLI は読み込めない設定ファイルを無視して既定値で生成する", async ({ expect }) => {
  // 準備
  const root = createTempProject({
    "vite.config.ts": "throw new Error('broken config');",
    "src/pages/_index.tsx": "export default 1;",
  });
  const messages: string[] = [];
  const errors: string[] = [];

  // 実行
  const code = await run(["typegen", "--root", root], createCliIo(root, messages, errors));

  // 検証
  expect(code).toBe(0);
  expect(fs.existsSync(path.join(root, ".pera1/types/src/pages/+types/_index.d.ts"))).toBe(true);
});

test.skipIf(!fs.existsSync(builtEntry))(
  "CLI はネストしたプラグイン配列からオプションを読み取る",
  async ({ expect }) => {
    // 準備
    const root = createTempProject({
      "vite.config.ts": [
        `import pera1 from ${JSON.stringify(builtEntry)};`,
        'export default { plugins: [[pera1({ dir: "app/routes", typesDir: ".custom/types" })]] };',
        "",
      ].join("\n"),
      "app/routes/_index.tsx": "export default 1;",
    });
    const messages: string[] = [];
    const errors: string[] = [];

    // 実行
    const code = await run(["typegen", "--root", root], createCliIo(root, messages, errors));

    // 検証
    expect(code).toBe(0);
    expect(fs.existsSync(path.join(root, ".custom/types/app/routes/+types/_index.d.ts"))).toBe(
      true,
    );
  },
);

test.skipIf(!fs.existsSync(builtEntry))(
  "CLI はオプションなしのプラグイン設定では既定値を使う",
  async ({ expect }) => {
    // 準備
    const root = createTempProject({
      "vite.config.ts": [
        `import pera1 from ${JSON.stringify(builtEntry)};`,
        "export default { plugins: [pera1()] };",
        "",
      ].join("\n"),
      "src/pages/_index.tsx": "export default 1;",
    });
    const messages: string[] = [];
    const errors: string[] = [];

    // 実行
    const code = await run(["typegen", "--root", root], createCliIo(root, messages, errors));

    // 検証
    expect(code).toBe(0);
    expect(fs.existsSync(path.join(root, ".pera1/types/src/pages/+types/_index.d.ts"))).toBe(true);
  },
);

test.skipIf(!fs.existsSync(builtEntry))(
  "CLI は対象外のプラグインを読み飛ばす",
  async ({ expect }) => {
    // 準備
    const root = createTempProject({
      "vite.config.ts": [
        `import pera1 from ${JSON.stringify(builtEntry)};`,
        'export default { plugins: [null, "plain", pera1({ dir: "app/routes" })] };',
        "",
      ].join("\n"),
      "app/routes/_index.tsx": "export default 1;",
    });
    const messages: string[] = [];
    const errors: string[] = [];

    // 実行
    const code = await run(["typegen", "--root", root], createCliIo(root, messages, errors));

    // 検証
    expect(code).toBe(0);
    expect(fs.existsSync(path.join(root, ".pera1/types/app/routes/+types/_index.d.ts"))).toBe(
      true,
    );
  },
);

test.skipIf(!fs.existsSync(builtEntry))(
  "CLI はプラグインのない設定ファイルでは既定値を使う",
  async ({ expect }) => {
    // 準備
    const root = createTempProject({
      "vite.config.ts": "export default {};\n",
      "src/pages/_index.tsx": "export default 1;",
    });
    const messages: string[] = [];
    const errors: string[] = [];

    // 実行
    const code = await run(["typegen", "--root", root], createCliIo(root, messages, errors));

    // 検証
    expect(code).toBe(0);
    expect(fs.existsSync(path.join(root, ".pera1/types/src/pages/+types/_index.d.ts"))).toBe(true);
  },
);

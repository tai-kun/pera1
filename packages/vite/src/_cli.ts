import fs from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";

import { loadConfigFromFile } from "vite";

import generateTypes from "./_generate-types.js";
import {
  DEFAULT_DIR,
  DEFAULT_EXCLUDE,
  DEFAULT_INCLUDE,
  DEFAULT_TYPES_DIR,
  PLUGIN_OPTIONS_SYMBOL,
  type ResolvedPluginOptions,
} from "./_options.js";

/**
 * CLI の入出力です。
 * テストから差し替えられるように分離しています。
 */
export type CliIo = {
  /**
   * 相対パスの解決に使うカレントディレクトリーです。
   */
  readonly cwd: string;

  /**
   * 標準出力へ書き込む関数です。
   */
  readonly write: (message: string) => void;

  /**
   * 標準エラー出力へ書き込む関数です。
   */
  readonly writeError: (message: string) => void;
};

/**
 * Vite の設定ファイルとして探索するファイル名の一覧です。
 */
const VITE_CONFIG_FILE_NAMES: readonly string[] = [
  "vite.config.ts",
  "vite.config.mts",
  "vite.config.js",
  "vite.config.mjs",
  "vite.config.cts",
  "vite.config.cjs",
];

const HELP_TEXT = `pera1-vite - pera1 のファイルベースルーティング用 CLI

使い方:
  pera1-vite typegen [オプション]

コマンド:
  typegen           ルートファイルに対応する型定義を生成します

オプション:
  --root <path>     プロジェクトルート（既定: カレントディレクトリー）
  --dir <path>      ページディレクトリー（既定: vite.config の設定、なければ ${DEFAULT_DIR}）
  --include <glob>  ルートとして扱うファイルの glob パターン（複数指定可）
  --exclude <glob>  ルートから除外するファイルの glob パターン（複数指定可、include より優先）
  --out <path>      型の生成先（既定: vite.config の設定、なければ ${DEFAULT_TYPES_DIR}）
  -h, --help        ヘルプを表示します
`;

/**
 * ネストされたプラグインの配列を平坦化します。
 *
 * @param plugins 平坦化する対象のプラグインの一覧です。
 * @returns 平坦化したプラグインの一覧です。
 */
function flattenPlugins(plugins: readonly unknown[]): readonly unknown[] {
  const flattened: unknown[] = [];

  for (const plugin of plugins) {
    if (Array.isArray(plugin)) {
      flattened.push(...flattenPlugins(plugin));
    } else {
      flattened.push(plugin);
    }
  }

  return flattened;
}

/**
 * `vite.config` を読み込み、`@pera1/vite` プラグインのオプションを取得します。
 *
 * 設定ファイルがない場合や読み込みに失敗した場合は `undefined` を返し、呼び出し側の既定値を使います。
 *
 * @param root プロジェクトルートの絶対パスです。
 * @returns 解決済みのプラグインオプション、または取得できなかった場合は `undefined` です。
 */
async function loadPluginOptions(root: string): Promise<ResolvedPluginOptions | undefined> {
  const configFile = VITE_CONFIG_FILE_NAMES
    .map((fileName) => path.join(root, fileName))
    .find((filePath) => fs.existsSync(filePath));

  if (configFile === undefined) {
    return undefined;
  }

  try {
    const loaded = await loadConfigFromFile(
      { command: "build", mode: "development" },
      configFile,
      root,
      "silent",
    );
    const plugins = flattenPlugins(loaded?.config.plugins ?? []);

    for (const plugin of plugins) {
      if (plugin === null || typeof plugin !== "object" || !(PLUGIN_OPTIONS_SYMBOL in plugin)) {
        continue;
      }

      return (plugin as { [PLUGIN_OPTIONS_SYMBOL]: ResolvedPluginOptions })[PLUGIN_OPTIONS_SYMBOL];
    }
  } catch {
    // 設定を読み込めないときは既定値で生成します。
  }

  return undefined;
}

/**
 * CLI を実行します。
 *
 * @param argv コマンドライン引数です。
 * @param io 入出力です。
 * @returns 終了コードです。
 */
export default async function run(argv: readonly string[], io: CliIo): Promise<number> {
  let values: {
    root?: string | undefined;
    dir?: string | undefined;
    include?: string[] | undefined;
    exclude?: string[] | undefined;
    out?: string | undefined;
    help?: boolean | undefined;
  };
  let positionals: string[];

  try {
    ({ values, positionals } = parseArgs({
      args: [...argv],
      allowPositionals: true,
      options: {
        root: { type: "string" },
        dir: { type: "string" },
        include: { type: "string", multiple: true },
        exclude: { type: "string", multiple: true },
        out: { type: "string" },
        help: { type: "boolean", short: "h" },
      },
    }));
  } catch (ex) {
    io.writeError(`${ex instanceof Error ? ex.message : String(ex)}\n\n${HELP_TEXT}`);

    return 1;
  }

  if (values.help === true) {
    io.write(HELP_TEXT);

    return 0;
  }

  const command = positionals[0];

  if (command === undefined) {
    io.writeError(HELP_TEXT);

    return 1;
  }

  if (command !== "typegen") {
    io.writeError(`不明なコマンドです: ${command}\n\n${HELP_TEXT}`);

    return 1;
  }

  if (positionals.length > 1) {
    io.writeError(`typegen に引数は指定できません: ${positionals.slice(1).join(" ")}\n`);

    return 1;
  }

  const root = path.resolve(io.cwd, values.root ?? ".");
  const pluginOptions = await loadPluginOptions(root);
  const dir = values.dir ?? pluginOptions?.dir ?? DEFAULT_DIR;
  const include = values.include ?? pluginOptions?.include ?? DEFAULT_INCLUDE;
  const exclude = values.exclude ?? pluginOptions?.exclude ?? DEFAULT_EXCLUDE;
  const typesDir = values.out ?? pluginOptions?.typesDir ?? DEFAULT_TYPES_DIR;

  try {
    const result = generateTypes({ root, dir, include, exclude, typesDir });

    for (const warning of result.warnings) {
      io.writeError(`警告: ${warning}\n`);
    }

    io.write(
      `ルート型を生成しました（生成: ${result.written.length} 件、削除: ${result.removed.length} 件）。\n`,
    );

    return 0;
  } catch (ex) {
    io.writeError(
      `ルート型の生成に失敗しました: ${ex instanceof Error ? ex.message : String(ex)}\n`,
    );

    return 1;
  }
}

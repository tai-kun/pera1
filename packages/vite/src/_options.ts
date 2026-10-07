/**
 * 解決済みの `@pera1/vite` プラグインオプションです。
 */
export type ResolvedPluginOptions = {
  /**
   * ページディレクトリーの、プロジェクトルートからの相対パスです。
   */
  readonly dir: string;

  /**
   * ルートとして扱うファイルの glob パターンです。ページディレクトリーからの相対パスで指定します。
   */
  readonly include: readonly string[];

  /**
   * ルートから除外するファイルの glob パターンです。ページディレクトリーからの相対パスで指定します。
   */
  readonly exclude: readonly string[];

  /**
   * ルート型の生成先の、プロジェクトルートからの相対パスです。
   */
  readonly typesDir: string;
};

/**
 * ページディレクトリーの既定値です。
 */
export const defaultDir = "src/pages";

/**
 * ルート型の生成先の既定値です。
 */
export const defaultTypesDir = ".pera1/types";

/**
 * ルートとして扱うファイルの glob パターンの既定値です。
 */
export const defaultInclude: readonly string[] = ["**/*.tsx", "**/*.ts", "**/*.jsx", "**/*.js"];

/**
 * ルートから除外するファイルの glob パターンの既定値です。
 */
export const defaultExclude: readonly string[] = [];

/**
 * CLI が `vite.config` からプラグインオプションを読み取るためのシンボルです。
 *
 * パッケージ内の複数のモジュールから参照するため、`Symbol.for` で同一のシンボルを共有します。
 */
export const pluginOptionsSymbol: unique symbol = Symbol.for("@pera1/vite/plugin-options");

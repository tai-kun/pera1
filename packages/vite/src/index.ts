import path from "node:path";

import type { Plugin } from "vite";

import generateRoutesModule from "./_generate-routes.js";
import generateTypes from "./_generate-types.js";
import {
  DEFAULT_DIR,
  DEFAULT_EXCLUDE,
  DEFAULT_INCLUDE,
  DEFAULT_TYPES_DIR,
  PLUGIN_OPTIONS_SYMBOL,
  type ResolvedPluginOptions,
} from "./_options.js";
import scanRoutes, { type RouteNode } from "./_scan-routes.js";

export type {
  ActionFunctionArgs,
  LoaderFunctionArgs,
  RouteParams,
  ShouldReloadFunctionArgs,
} from "@pera1/core";

/**
 * `@pera1/vite` プラグインのオプションです。
 */
export type Pera1VitePluginOptions = {
  /**
   * ルートの探索対象となるページディレクトリーの、プロジェクトルートからの相対パスです。
   *
   * @default "src/pages"
   */
  readonly dir?: string;

  /**
   * ルートとして扱うファイルの glob パターンです。
   *
   * ページディレクトリーからの相対パスで指定します。
   * パターンは追加順に評価されるわけではなく、いずれかに一致すれば対象になります。
   *
   * @default 拡張子が `.tsx`、`.ts`、`.jsx`、`.js` のすべてのファイル
   */
  readonly include?: readonly string[];

  /**
   * ルートから除外するファイルの glob パターンです。
   *
   * ページディレクトリーからの相対パスで指定します。
   * `include` より優先されます。
   *
   * @default []
   */
  readonly exclude?: readonly string[];

  /**
   * ルート型の生成先となるディレクトリーの、プロジェクトルートからの相対パスです。
   *
   * `tsconfig.json` の `rootDirs` には、このディレクトリーとプロジェクトルートを指定します。
   *
   * @default ".pera1/types"
   */
  readonly typesDir?: string;
};

/**
 * ルートノードが参照するページモジュールを、重複なくすべて列挙します。
 *
 * @param nodes 列挙の対象となるルートノードです。
 * @param paths 追加先のセットです。
 * @returns ページモジュールの絶対パスを格納したセットです。
 */
function collectModulePaths(
  nodes: readonly RouteNode[],
  paths: Set<string> = new Set(),
): Set<string> {
  for (const node of nodes) {
    paths.add(node.modulePath);
    collectModulePaths(node.children, paths);
  }

  return paths;
}

/**
 * ファイルが指定されたディレクトリーの配下にあるかどうかを判定します。
 *
 * @param directoryPath 判定の基準となるディレクトリーの絶対パスです。
 * @param filePath 判定する対象のファイルの絶対パスです。
 * @returns ディレクトリーの配下にある場合は `true` です。
 */
function isInDirectory(directoryPath: string, filePath: string): boolean {
  const relativePath = path.relative(directoryPath, filePath);

  return relativePath !== "" && !relativePath.startsWith("..") && !path.isAbsolute(relativePath);
}

/**
 * ルート定義を提供する仮想モジュールの ID です。
 *
 * アプリケーション側では `import { routes } from "virtual:pera1/routes"` として参照します。
 */
export const VIRTUAL_ROUTES_ID = "virtual:pera1/routes";

/**
 * Vite が内部で使う、解決済みの仮想モジュール ID です。
 */
const RESOLVED_VIRTUAL_ROUTES_ID = `\0${VIRTUAL_ROUTES_ID}`;


/**
 * ファイルとディレクトリーの構成からルート定義を生成し、`virtual:pera1/routes` として提供する Vite プラグインです。
 *
 * あわせて、各ルートファイルが `./+types/<ファイル名>` から import できるルート型を生成します。
 * 開発サーバーではファイルの追加・変更・削除を監視し、ルート型を自動で再生成します。
 *
 * @param options プラグインのオプションです。
 * @returns Vite プラグインです。
 */
export default function pera1(options: Pera1VitePluginOptions = {}): Plugin {
  const dir = options.dir ?? DEFAULT_DIR;
  const include = options.include ?? DEFAULT_INCLUDE;
  const exclude = options.exclude ?? DEFAULT_EXCLUDE;
  const typesDir = options.typesDir ?? DEFAULT_TYPES_DIR;
  let root = process.cwd();
  let command: "build" | "serve" = "serve";

  /**
   * ルート型を生成し、警告を通知関数へ流します。
   * 生成に失敗しても開発サーバーは止めません。
   */
  function generateRouteTypes(warn: (message: string) => void): void {
    try {
      const result = generateTypes({ root, dir, include, exclude, typesDir });

      for (const warning of result.warnings) {
        warn(warning);
      }
    } catch (ex) {
      warn(`ルート型の生成に失敗しました: ${ex instanceof Error ? ex.message : String(ex)}`);
    }
  }

  const plugin: Plugin = {
    name: "pera1",

    configResolved(config) {
      root = config.root;
      command = config.command;
    },

    buildStart() {
      if (command === "build") {
        generateRouteTypes((message) => {
          this.warn(message);
        });
      }
    },

    watchChange(id) {
      if (command === "build" && isInDirectory(path.resolve(root, dir), id)) {
        generateRouteTypes((message) => {
          this.warn(message);
        });
      }
    },

    resolveId(id) {
      if (id === VIRTUAL_ROUTES_ID) {
        return RESOLVED_VIRTUAL_ROUTES_ID;
      }

      return undefined;
    },

    load(id) {
      if (id !== RESOLVED_VIRTUAL_ROUTES_ID) {
        return undefined;
      }

      const nodes = scanRoutes({ root, dir, include, exclude });

      // ビルドのウォッチモードでも、ページモジュールの変更を検知できるようにします。
      for (const modulePath of collectModulePaths(nodes)) {
        this.addWatchFile(modulePath);
      }

      return generateRoutesModule({ root, nodes });
    },

    configureServer(server) {
      const pagesDirectory = path.resolve(server.config.root, dir);
      const logger = server.config.logger;
      const warn = (message: string): void => {
        logger.warn(message);
      };

      generateRouteTypes(warn);

      const onRouteFileChanged = (filePath: string, reload: boolean): void => {
        if (!isInDirectory(pagesDirectory, filePath)) {
          return;
        }

        generateRouteTypes(warn);

        if (!reload) {
          return;
        }

        const module = server.moduleGraph.getModuleById(RESOLVED_VIRTUAL_ROUTES_ID);
        if (module !== undefined) {
          server.moduleGraph.invalidateModule(module);
        }

        server.ws.send({ type: "full-reload" });
      };

      server.watcher.on("add", (filePath) => {
        onRouteFileChanged(filePath, true);
      });
      server.watcher.on("unlink", (filePath) => {
        onRouteFileChanged(filePath, true);
      });
      server.watcher.on("change", (filePath) => {
        onRouteFileChanged(filePath, false);
      });
    },
  };

  // CLI が vite.config からオプションを読み取れるように、解決済みの値をプラグインへ添付します。
  (plugin as unknown as Record<symbol, unknown>)[PLUGIN_OPTIONS_SYMBOL] = {
    dir,
    include,
    exclude,
    typesDir,
  } satisfies ResolvedPluginOptions;

  return plugin;
}

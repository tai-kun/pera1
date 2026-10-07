import log from "../_logger.js";
import compareRoutePaths from "./_compare-route-paths.js";
import { createBarePathLoader, findIndexChildTarget } from "./_redirect.js";
import RoutePatternUtils from "./route-pattern-utils.js";
import type { Route, RouteDefinition } from "./route.types.js";

/**
 * 連続する複数のスラッシュを検出するための正規表現です。
 */
const MULTI_SLASH = /\/\/+/gu;

/**
 * パス文字列を正規化します。先頭に `/` を付け、重複スラッシュを畳み、
 * ルート (`/`) 以外の末尾スラッシュを取り除きます。
 *
 * @param path 正規化の対象となるパス文字列です。
 * @returns 正規化されたパス文字列です。
 */
function normalizeJoinedPath(path: string): string {
  let normalized = ("/" + path).replace(MULTI_SLASH, "/");
  if (normalized.length > 1 && normalized.endsWith("/")) {
    normalized = normalized.slice(0, -1);
  }

  return normalized;
}

/**
 * 親パスと子パスを結合して、子の完全パスを解決します。
 *
 * - 子 `path` が `"/"` 始まりなら絶対パスとして扱い、親を無視します。
 * - それ以外なら親パスに相対結合します。
 * - 子 `path` の省略時 (または空文字時) は親パスを継承します (`index: true` の子やパスレスレイアウト用)。
 * - 親がないトップレベルでは、先頭 `/` を補って正規化します。
 *
 * @param parentPath 親の完全パス、トップレベルでは `undefined` です。
 * @param definition 子のルート定義です。
 * @returns 解決済みの完全パス文字列です。
 */
function resolveFullPath(
  parentPath: string | undefined,
  definition: RouteDefinition<string, any>,
): string {
  const childPath = typeof definition.path === "string" ? definition.path : "";

  if (parentPath === undefined) {
    if (childPath === "") {
      return "/";
    }

    return normalizeJoinedPath(childPath);
  }

  if (childPath === "") {
    return normalizeJoinedPath(parentPath);
  }

  if (childPath.startsWith("/")) {
    return normalizeJoinedPath(childPath);
  }

  return normalizeJoinedPath(parentPath + "/" + childPath);
}

/**
 * 開発時に `index: true` のルートが `children` を持つ不正な定義を警告します。
 *
 * React Router と同様に index ルートは子を持てません。
 *
 * 警告に留め、フラット化自体は継続します。
 *
 * @param definition 検証対象のルート定義です。
 * @param fullPath 解決済みの完全パス文字列です。
 */
function warnIfIndexHasChildren(definition: RouteDefinition<string, any>, fullPath: string): void {
  const children = definition.children;
  if (definition.index === true && Array.isArray(children) && children.length > 0) {
    log.warn(
      "index ルートは children を持てません（path: {path}）。children は無視して展開を継続します。",
      { path: fullPath },
    );
  }
}

type FlattenedEntry<TComponent> = {
  readonly definition: RouteDefinition<string, TComponent>;
  readonly fullPath: string;
};

/**
 * `children` による明示的ネストを再帰的にフラット化します。
 *
 * 親自体もレイアウトとして残し、子は親パスと結合した完全パスで展開します。
 * `children` なしの定義は従来の flat 配列としてそのまま残ります。
 *
 * 展開順は子が先・親が後 (後順) です。
 * 同 `path` の index とレイアウトは詳細度が等しく安定ソートで定義順が保たれるため、子 (`index`) を先に置くことで flat 記法の慣習 (`index` を先に定義し、描画でレイアウトが `index` を包む) と同じマッチ順になります。
 *
 * @param definitions 展開対象のルート定義配列です。
 * @param parentPath 親の完全パス、トップレベルでは `undefined` です。
 * @returns 解決済み完全パス付きのフラットなエントリー配列です。
 */
function flattenRouteDefinitions<TComponent>(
  definitions: readonly RouteDefinition<string, TComponent>[],
  parentPath?: string,
): FlattenedEntry<TComponent>[] {
  const flattened: FlattenedEntry<TComponent>[] = [];
  for (const definition of definitions) {
    const fullPath = resolveFullPath(parentPath, definition);
    warnIfIndexHasChildren(definition, fullPath);
    const children = definition.children;
    if (children !== undefined && children.length > 0) {
      flattened.push(...flattenRouteDefinitions(children, fullPath));
    }
    flattened.push({ definition, fullPath });
  }

  return flattened;
}

/**
 * 定義したルーティング設定の配列を、内部のルーティングエンジンが直接利用可能な正規化済みのルートオブジェクトの配列へ変換します。
 *
 * 実行内容はフラット化・パス正規化・裸パス誘導の合成・正規表現コンパイル・詳細度ソートです。
 *
 * `children` なしの既存 flat 配列は従来通り動作します。
 *
 * 裸パス（`index: true` が完全一致しない URL）は子の index へ自動誘導します。
 *
 * 対象は追加セグメント最少の index で、同点時は定義順序が早いものです。
 *
 * 同一パスの index が存在する場合は通常描画で足りるため合成しません。
 *
 * @template TComponent 描画対象となるコンポーネントの型です。
 * @param routes ルーティング定義を格納した読み取り専用の配列です。
 * @returns 読み取り専用の正規化済みルートオブジェクトの配列です。
 */
export default function processRoutes<TComponent = any>(
  routes: readonly RouteDefinition<string, TComponent>[],
): readonly Route<TComponent>[] {
  const flattened = flattenRouteDefinitions(routes);
  const entries = flattened.map(({ definition, fullPath }, order) => ({
    definition,
    fullPath,
    index: definition.index === true,
    order,
  }));

  return (
    entries
      .map(({ definition: route, fullPath, index }) => {
        const utils = new RoutePatternUtils(fullPath, {
          // インデックスルートでないときは子ルートへの前方一致を有効にします。
          allowChild: !index,
        });
        // 裸パス誘導の対象を子の index から自動決定します。
        // 前方一致そのものは変えず、実行時に完全一致だけを誘導します。
        let loader = route.loader;
        let shouldReload = route.shouldReload;
        if (!index) {
          const target = findIndexChildTarget(entries, fullPath);
          if (target !== undefined) {
            const composed = createBarePathLoader({ fullPath, target, loader, shouldReload });
            loader = composed.loader;
            shouldReload = composed.shouldReload;
          }
        }

        return {
          path: utils.route,
          index,
          utils,
          action: route.action,
          loader,
          // オブジェクト形式またはモジュール形式の双方を評価して描画対象を確定します。
          // モジュール形式は名前空間の展開 (`{ path, ...module }`) で `Symbol.toStringTag` が
          // 失われるため、`default` エクスポートの有無そのもので判定します。
          component:
            typeof route.component === "function"
              ? route.component
              : "default" in route && typeof route.default === "function"
                ? route.default
                : undefined,
          shouldReload: shouldReload || ((args) => args.defaultShouldReload),
        };
      })
      // 詳細度が高い順にソートします。
      .sort((a, b) => compareRoutePaths(a.path, b.path))
  );
}

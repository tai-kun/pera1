import compareRoutePaths from "./_compare-route-paths.js";
import RoutePatternUtils from "./route-pattern-utils.js";
import type { Route, RouteDefinition } from "./route.types.js";

/**
 * 定義したルーティング設定の配列を、内部のルーティングエンジンが直接利用可能な正規化済みのルートオブジェクトの配列へと変換します。
 *
 * 実行内容:
 * - 各ルートのパス正規化
 * - 動的解析用の正規表現コンパイル
 * - 詳細度に基づく優先順位ソート
 *
 * @template TComponent 描画対象となるコンポーネントの型です。React / Solid.js などフレームワークごとの型を指定できます。
 * @param routes ルーティング定義を格納した読み取り専用の配列です。
 * @returns 読み取り専用の正規化済みルートオブジェクトの配列です。
 */
export default function processRoutes<TComponent = any>(
  routes: readonly RouteDefinition<string, TComponent>[],
): readonly Route<TComponent>[] {
  return (
    routes
      .map((route) => {
        const index = route.index === true;
        const utils = new RoutePatternUtils(route.path, {
          // インデックスルートでないとき allowChild オプションを `true` にして子ルートに対してもマッチするようにします。
          // これにより、前方一致による階層的なマッチングが有効になります。
          allowChild: !index,
        });

        return {
          path: utils.route,
          index,
          utils,
          action: route.action,
          loader: route.loader,
          // オブジェクト形式またはモジュール形式の双方を安全に評価し、描画対象となるコンポーネントを確定します。
          component:
            typeof route.component === "function"
              ? route.component
              : Symbol.toStringTag in route &&
                  route[Symbol.toStringTag] === "Module" &&
                  typeof route.default === "function"
                ? route.default
                : undefined,
          shouldReload: route.shouldReload || ((args) => args.defaultShouldReload),
        };
      })
      // すべてのルートを正規化した後、compareRoutePaths 関数を用いて詳細度が高い順にソートします。
      // マッチング漏れや誤ったルートへの誤認を防ぐため、制限の厳しい（具体的な）パスパターンを持つルートオブジェクトが配列のより前方に配置されます。
      .sort((a, b) => compareRoutePaths(a.path, b.path))
  );
}

import type { ReadonlyURL } from "./readonly-url.types.js";
import type { Route, RouteParams } from "./route.types.js";

/**
 * URL とのマッチングが確認されたルート情報を表す型定義です。
 *
 * 基本となる `Route` オブジェクトの構造を引き継ぎつつ、抽出された動的パラメーターと、それらを埋め戻して構築された具体的な URL パス文字列が追加されています。
 *
 * @template TComponent 表示対象となるコンポーネントの型です。
 */
export type MatchedRoute<TComponent = any> = Route<TComponent> & {
  /**
   * 現在の URL パスから抽出された、このルート固有の動的パスパラメーターです。
   */
  readonly params: RouteParams;

  /**
   * ルートの定義パターン（例: `/users/:id`）に抽出したパラメーター（例: `{ id: "42" }`）を流し込み、具現化されたリクエストパス（例: `/users/42`）です。
   */
  readonly urlPath: string;
};

/**
 * 事前に詳細度順でソートされたルート定義の配列から、指定された URL に適合するすべてのルートを探索・抽出し、マッチした順に正規化して返す関数です。
 *
 * ネストされた階層的なルーティング構造において、親ルートから子ルートまで、現在の URL に部分一致または完全一致するルートの連鎖を構成する目的で使用します。
 *
 * @param routes あらかじめ正規化およびソートが完了しているルートオブジェクトの読み取り専用配列です。
 * @param url マッチングの判定元となる、読み取り専用の URL オブジェクトです。
 * @returns マッチしたルートが 1 つ以上存在する場合は、最低 1 つの要素を持つことが保証された `MatchedRoute` の読み取り専用タプル配列を返します。1 つもマッチしなかった場合は `null` を返します。
 */
export default function matchRoutes<TComponent = any>(
  routes: readonly Route<TComponent>[],
  url: ReadonlyURL,
): readonly [MatchedRoute<TComponent>, ...MatchedRoute<TComponent>[]] | null {
  const matched: MatchedRoute<TComponent>[] = [];

  // 登録されているすべてのルートを前方から順番に走査します。
  // routes 配列は詳細度が高い順に並んでいることが前提となります。
  for (const route of routes) {
    const params = route.utils.parseSafe(url);
    if (params === null) {
      continue;
    }

    matched.push({
      ...route,
      params,
      urlPath: route.utils.inject(params),
    });
  }

  if (matched.length > 0) {
    return matched as [any];
  }

  return null;
}

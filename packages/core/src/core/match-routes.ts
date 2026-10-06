import type { ReadonlyURL } from "./readonly-url.types.js";
import type { Route, RouteParams } from "./route.types.js";
import RoutePatternUtils from "./route-pattern-utils.js";

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
 * 事前に詳細度順でソートされたルート定義の配列から、指定された URL に適合するすべてのルートを探索、抽出し、マッチした順に正規化して返す関数です。
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
    return applyStaticPriorityFilter(matched, url) as [any];
  }

  return null;
}

/**
 * パスパターンを `/` 区切りのセグメント配列に分解します。
 *
 * @param path 分解対象のパスパターン文字列です。
 * @returns 空文字を除いたセグメント配列です。`"/"` は空配列になります。
 */
function splitPatternSegments(path: string): string[] {
  return path.split("/").filter(Boolean);
}

/**
 * ワイルドカード (`*` を含む) セグメントかどうかを判定します。
 *
 * `/*` (006 スコープ) を誤って除外しないため、ワイルドカードを含むルートは
 * 優先除外の勝者にも敗者にもしません。
 *
 * @param segment 判定対象の単一セグメント文字列です。
 * @returns ワイルドカードを含む場合は `true` です。
 */
function isWildcardSegment(segment: string): boolean {
  return segment.includes("*");
}

/**
 * 名前付きパラメーター (`:id`、`/:id?`、接尾辞付き `/:title.mp4` を含む) かどうかを判定します。
 *
 * @param segment 判定対象の単一セグメント文字列です。
 * @returns パラメーターセグメントの場合は `true` です。
 */
function isParamSegment(segment: string): boolean {
  return !isWildcardSegment(segment) && segment.startsWith(":");
}

/**
 * 静的セグメントかどうかを判定します。
 *
 * @param segment 判定対象の単一セグメント文字列です。
 * @returns 静的セグメントの場合は `true` です。
 */
function isStaticSegment(segment: string): boolean {
  return !isWildcardSegment(segment) && !segment.startsWith(":");
}

/**
 * マッチ鎖から、静的ルートに敗北したパラメータールートを取り除きます (issue 005)。
 *
 * 背景: `/app/projects/new` (static・完全一致) と `/app/projects/:projectId`
 * (param・`allowChild` による前方一致) は兄弟競合ですが、`matchRoutes` は従来
 * マッチ全件を返していたため、子の static の下に親の param layout が混ざり、
 * 利用者側で `projectId === "new"` の分散ガードが必要になっていました。
 *
 * 除外条件 (いずれも満たす場合のみ除外):
 * - 敗者候補・勝者候補のいずれもワイルドカード (`*` を含む) を含まない。
 * - 勝者は URL に完全一致する (strict 照合=`allowChild: false` でマッチ)。
 * - 同一セグメント位置 `k` で、勝者が静的・敗者がパラメーターである。
 *
 * 正当な親レイアウト (例: `/app` → `/app/dashboard` の親) は、全セグメントが
 * 静的同士で等しいため除外されません。`/` (空セグメント) も除外の対象にも
 * 理由にもなりません。`/*` はワイルドカードとして常に保持されます。
 *
 * モック等で `path` を持たないルートは判定不能のため常に保持します。
 *
 * @param matched 詳細度順に収集されたマッチ済みルート配列です。
 * @param url マッチングの判定元となる URL オブジェクトです。
 * @returns 除外フィルタ適用後のマッチ済みルート配列です。
 */
function applyStaticPriorityFilter<TComponent>(
  matched: MatchedRoute<TComponent>[],
  url: ReadonlyURL,
): MatchedRoute<TComponent>[] {
  type Entry = {
    readonly route: MatchedRoute<TComponent>;
    readonly segments: readonly string[] | undefined;
    readonly exact: boolean;
    readonly wildcard: boolean;
  };

  const entries: Entry[] = matched.map((route) => {
    const pattern =
      typeof route.path === "string" ? route.path : (route.utils as any)?.route;
    if (typeof pattern !== "string") {
      return { route, segments: undefined, exact: false, wildcard: false };
    }
    const segments = splitPatternSegments(pattern);
    const wildcard = segments.some(isWildcardSegment);
    let exact = false;
    if (!wildcard) {
      try {
        exact = new RoutePatternUtils(pattern).match(url);
      } catch {
        exact = false;
      }
    }
    return { route, segments, exact, wildcard };
  });

  const winners = entries.filter(
    (entry) => entry.segments !== undefined && !entry.wildcard && entry.exact,
  );
  if (winners.length === 0) {
    return matched;
  }
  if (!winners.some((winner) => winner.segments!.some(isStaticSegment))) {
    return matched;
  }

  const filtered: MatchedRoute<TComponent>[] = [];
  for (const entry of entries) {
    if (entry.segments === undefined || entry.wildcard) {
      filtered.push(entry.route);
      continue;
    }
    let excluded = false;
    for (const winner of winners) {
      if (entry.route === winner.route) {
        continue;
      }
      const loserSegments = entry.segments;
      const winnerSegments = winner.segments!;
      const length = Math.min(loserSegments.length, winnerSegments.length);
      for (let k = 0; k < length; k++) {
        if (isStaticSegment(winnerSegments[k]!) && isParamSegment(loserSegments[k]!)) {
          excluded = true;
          break;
        }
      }
      if (excluded) {
        break;
      }
    }
    if (!excluded) {
      filtered.push(entry.route);
    }
  }

  return filtered.length > 0 ? filtered : matched;
}

/**
 * ローダー実行回数のカウンターです。
 *
 * `/lab/limits` で「履歴エントリー単位のキャッシュ」を可視化するために使います。
 * 戻る・進むでキャッシュが再利用されると、このカウンターが増えないことで確認できます。
 */

const runs = new Map<string, number>();

/**
 * 指定した名前のカウンターを 1 つ進めます。
 */
export function bumpLoaderRun(name: string): number {
  const next = (runs.get(name) ?? 0) + 1;
  runs.set(name, next);

  return next;
}

/**
 * 現在のカウンター値を返します。
 */
export function loaderRunCount(name: string): number {
  return runs.get(name) ?? 0;
}

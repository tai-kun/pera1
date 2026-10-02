/**
 * セグメントの種類に応じたスコア定数です。
 *
 * 数値が大きいほど優先順位（詳細度）が高いです。
 *
 * 詳細度（regexparam の README より）:
 * | 順位 | 種別 | 例 |
 * | --: | :-- | :-- |
 * | 1 | Static                | `/foo`, `/foo/bar`                                    |
 * | 2 | Parameter with suffix | `/movies/:title.mp4`, `/movies/:title.(mp4\|mov)`     |
 * | 3 | Parameter             | `/:title`, `/books/:title`, `/books/:genre/:title`    |
 * | 4 | Optional Parameters   | `/:title?`, `/books/:title?`, `/books/:genre/:title?` |
 * | 5 | Wildcards             | `*`, `/books/*`, `/books/:genre/*`                    |
 * | 6 | Optional Wildcard     | `/books/*?`                                           |
 *
 * @see https://github.com/lukeed/regexparam
 */
const SCORE = {
  PARAM: 4,
  STATIC: 6,
  WILDCARD: 2,
  OPTIONAL_PARAM: 3,
  OPTIONAL_WILDCARD: 1,
  PARAM_WITH_SUFFIX: 5,
} as const;

/**
 * 与えられた単一のセグメント文字列を解析し、その特性に応じた詳細度スコアを算出します。
 *
 * @param s 解析対象となるセグメント文字列です。
 * @returns セグメントの種別に対応する、`SCORE` 定数から抽出された数値スコアです。
 */
function getSegmentScore(s: string): number {
  if (s === "*?") {
    return SCORE.OPTIONAL_WILDCARD;
  }

  if (s === "*") {
    return SCORE.WILDCARD;
  }

  if (s[0] === ":") {
    if (s[s.length - 1] === "?") {
      return SCORE.OPTIONAL_PARAM;
    }

    if (s.indexOf(".") < 0) {
      return SCORE.PARAM;
    }

    return SCORE.PARAM_WITH_SUFFIX;
  }

  return SCORE.STATIC;
}

/**
 * 英語のロケール設定に基づき、大文字小文字などを標準化した文字列比較を行うための `Intl.Collator` インスタンスです。
 *
 * 決定論的な辞書順ソートを保証するために使用します。
 */
const enCollator = new Intl.Collator("en");

/**
 * 2つのルートパスの優先順位を比較し、ソート順を決定するための比較関数です。
 *
 * より具体的で制限の厳しいパス（詳細度スコアが高いパス）が、ソート結果においてより前方に配置されるように負の値を返します。
 *
 * @param pathA 比較対象となる1つ目のパス文字列です。
 * @param pathB 比較対象となる2つ目のパス文字列です。
 * @returns `pathA` を優先する場合は負の数、`pathB` を優先する場合は正の数、等価である場合は `0` を返します。
 */
export default function compareRoutePaths(pathA: string, pathB: string): number {
  const partsA = pathA.split("/").filter(Boolean);
  const partsB = pathB.split("/").filter(Boolean);
  const length = Math.max(partsA.length, partsB.length);

  for (let i = 0; i < length; i++) {
    const a = partsA[i];
    // パス A のセグメントが先に終了した場合は、パス B を優先します。
    if (a === undefined) {
      return 1;
    }

    const b = partsB[i];
    // パス B のセグメントが先に終了した場合は、パス A を優先します。
    if (b === undefined) {
      return -1;
    }

    const scoreA = getSegmentScore(a);
    const scoreB = getSegmentScore(b);
    // スコアが異なる場合は、スコアが高い方を優先します。
    if (scoreA !== scoreB) {
      return scoreB - scoreA;
    }
    // スコアが同じ場合は、文字列の辞書順で比較します。
    if (a !== b) {
      return enCollator.compare(a, b);
    }
  }

  return 0;
}

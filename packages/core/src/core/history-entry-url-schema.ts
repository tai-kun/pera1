import singleton from "./_singleton.js";
import * as v from "./_valibot.js";
import type { ReadonlyURL } from "./readonly-url.types.js";
import RoutePath from "./route-path.js";

/**
 * `HistoryEntryUrlSchema` による検証と変換を行う前の入力値です。
 */
export type HistoryEntryUrlLike = v.InferInput<ReturnType<typeof HistoryEntryUrlSchema>>;

/**
 * `HistoryEntryUrlSchema` による検証、並び替え、および変換が正常に完了した、安全な出力値です。
 */
export type HistoryEntryUrl = v.InferOutput<ReturnType<typeof HistoryEntryUrlSchema>>;

/**
 * 履歴エントリーで使用される URL 文字列を検証し、正規化し、ブランド化するためのスキーマを作成する関数です。
 *
 * スキーマの構築処理は一度だけ実行され、以降はシングルトンインスタンスとしてキャッシュから再利用されます。
 */
const HistoryEntryUrlSchema = () =>
  singleton("HistoryEntryUrlSchema", () =>
    v.pipe(
      v.string(),
      v.url(),
      // 検証を通過した URL 文字列を、読み取り専用の ReadonlyURL オブジェクトへ構造変換および正規化します。
      v.transform(function toNormalizedReadonlyURL(s): ReadonlyURL {
        const u = new URL(s);

        // 正規化します。
        const { hash, search, pathname } = new RoutePath(u);
        u.hash = hash;
        u.search = search;
        u.pathname = pathname;

        return u;
      }),
      v.brand("HistoryEntryUrl"),
    ),
  );

export default HistoryEntryUrlSchema;

import singleton from "./_singleton.js";
import * as v from "./_valibot.js";

/**
 * 履歴エントリーの識別子を検証およびブランド化するためのスキーマを作成する関数です。
 *
 * スキーマの生成処理は一度だけ実行され、以降はシングルトンインスタンスとしてキャッシュから再利用されます。
 */
const HistoryEntryIdSchema = () =>
  singleton("HistoryEntryIdSchema", () => v.pipe(v.string(), v.uuid(), v.brand("HistoryEntryId")));

/**
 * `HistoryEntryIdSchema` による検証を通過する前の、入力値に対応する型定義です。
 */
export type HistoryEntryIdLike = v.InferInput<ReturnType<typeof HistoryEntryIdSchema>>;

/**
 * `HistoryEntryIdSchema` による検証および解析が正常に完了した、安全な出力値の型定義です。
 */
export type HistoryEntryId = v.InferOutput<ReturnType<typeof HistoryEntryIdSchema>>;

export default HistoryEntryIdSchema;

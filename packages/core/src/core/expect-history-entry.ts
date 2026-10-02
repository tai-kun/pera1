import singleton from "./_singleton.js";
import * as v from "./_valibot.js";
import HistoryEntryIdSchema, { type HistoryEntryId } from "./history-entry-id-schema.js";
import HistoryEntryUrlSchema, { type HistoryEntryUrl } from "./history-entry-url-schema.js";

/**
 * 履歴エントリーオブジェクト全体の構造を検証するためのスキーマを作成する関数です。
 *
 * スキーマの構築処理は一度だけ実行され、以降はシングルトンインスタンスとしてキャッシュから再利用されます。
 */
const HistoryEntrySchema = () =>
  singleton("HistoryEntrySchema", () =>
    v.object({
      /**
       * 履歴エントリーの識別子です。
       */
      id: HistoryEntryIdSchema(),

      /**
       * 履歴エントリーの絶対 URL です。
       */
      url: v.nullable(HistoryEntryUrlSchema()),

      /**
       * 履歴エントリーリスト内の履歴エントリーのインデックスです。
       */
      index: v.pipe(v.number(), v.safeInteger(), v.minValue(-1)),
    }),
  );

/**
 * `HistoryEntrySchema` による検証と構造変換を行う前の、生の入力オブジェクトに対応する型定義です。
 */
export type HistoryEntryLike = v.InferInput<ReturnType<typeof HistoryEntrySchema>>;

/**
 * `expectHistoryEntry` 関数による検証を通過した、ランタイムで確定的に使用可能な履歴エントリーの型定義です。
 */
export type HistoryEntry = {
  /**
   * 履歴エントリーの識別子です。
   */
  readonly id: HistoryEntryId;

  /**
   * 履歴エントリーの絶対 URL です。
   */
  readonly url: HistoryEntryUrl;

  /**
   * 履歴エントリーリスト内の履歴エントリーのインデックスです。
   */
  readonly index: number;
};

/**
 * 履歴エントリーオブジェクトを検証し、仕様を満たしている場合に確定的な `HistoryEntry` 型へと変換します。
 *
 * @param entry スキーマの基本構造を満たしていると予想される生の入力値です。
 * @returns すべてのプロパティーが完全に確定した `HistoryEntry` を返します。
 */
function expectHistoryEntry(entry: HistoryEntryLike): HistoryEntry;

/**
 * 履歴エントリーオブジェクトを検証し、仕様を満たしている場合に確定的な `HistoryEntry` 型へと変換します。
 *
 * @param entry スキーマの入力形式を満たすオブジェクト、または空値です。
 * @returns 入力値が空であった場合、あるいは検証の過程で必要なデータが欠落していた場合は `null` を返します。
 */
function expectHistoryEntry(entry: HistoryEntryLike | null | undefined): HistoryEntry | null;

function expectHistoryEntry(entry: HistoryEntryLike | null | undefined): HistoryEntry | null {
  if (entry == null) {
    return null;
  }

  const { id, url, index } = v.expect(HistoryEntrySchema(), entry);
  if (
    // 特定の条件下で null に設定される場合があるので、そのときは null を返します。
    !url ||
    // 現在のドキュメントが完全にアクティブでない場合は -1 になってしまうので、そのときは null を返します。
    index < 0
  ) {
    return null;
  }

  return {
    id,
    url,
    index,
  };
}

export default expectHistoryEntry;

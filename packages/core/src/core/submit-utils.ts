import type { IEngine } from "../engines/engine.types.js";
import type { ReadonlyFormData } from "./readonly-form-data.types.js";
import type { ReadonlyURLSearchParams } from "./readonly-url.types.js";

/**
 * クエリーパラメーター送信 (HTTP GET 相当) のサブミット処理をカスタマイズするためのオプションです。
 */
export type SubmitGetOptions = {
  /**
   * 遷移先のベースとなる URL パスを明示的に上書き指定します。
   * 省略時は現在のフォームアクションパスが使用されます。
   */
  readonly action?: string | undefined;

  /**
   * 履歴スタックへの追加方法を制御します。
   * `true` の場合は現在の履歴を上書きし、`false` または省略時は新規追加します。
   */
  readonly replace?: boolean | undefined;
};

/**
 * フォームデータ送信 (HTTP POST 相当) のサブミット処理をカスタマイズするためのオプションです。
 */
export type SubmitPostOptions = {
  /**
   * アクション実行先の URL パスを明示的に上書き指定します。
   * 省略時は現在のフォームアクションパスが使用されます。
   */
  readonly action?: string | undefined;
};

/**
 * `useSubmit` や将来の Solid.js 版が受け取る引数を、低レイヤーの `IEngine.SubmitArgs` に変換します。
 *
 * `FormData` か `URLSearchParams` かのランタイム判定を含めた分岐ロジックを `core` に集約することで、フレームワーク間の振る舞いの乖離を防ぎます。
 *
 * @param target 送信するフォームデータまたは検索クエリーです。
 * @param formAction 現在のルートに対応する既定のフォームアクションパスです。
 * @param options 送信動作をカスタマイズするためのオプションです。
 * @returns エンジンに引き渡すための正規化済み引数です。
 */
export function toSubmitArgs(
  target: ReadonlyURLSearchParams | ReadonlyFormData,
  formAction: string,
  options: SubmitGetOptions | SubmitPostOptions = {},
): IEngine.SubmitArgs {
  if (target instanceof FormData) {
    // 分岐 1: データ実体がフォームデータである場合 = 副作用を伴うデータ変更処理 (POST / Action 契機) です。
    const { action = formAction } = options as SubmitPostOptions;

    return {
      type: "FORM_DATA",
      target,
      action,
    };
  }
  // 分岐 2: データ実体がクエリーパラメーターである場合 = 読み取り専用の条件更新処理 (GET / Loader 契機) です。
  const { action = formAction, replace } = options as SubmitGetOptions;

  return {
    type: "URL_SEARCH_PARAMS",
    target: target as URLSearchParams,
    action,
    // `replace` の真偽値に基づき、ブラウザー履歴の追加方法 (`push` / `replace`) を明示的にマッピングします。
    history: replace ? "replace" : "push",
  };
}

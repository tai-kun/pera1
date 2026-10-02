import type {
  ReadonlyFormData,
  ReadonlyURLSearchParams,
  SubmitGetOptions,
  SubmitPostOptions,
} from "@pera1/core";
import { toSubmitArgs } from "@pera1/core";
import * as React from "react";

import useFormAction from "./use-form-action.js";
import useRouterContext from "./use-router-context.js";

export type { SubmitGetOptions, SubmitPostOptions };

/**
 * プログラムから命令的にデータ送信および画面遷移を実行する、`submit` 関数のオーバーロードインターフェース定義です。
 */
export interface SubmitFunction {
  /**
   * 不変のフォームデータを引き渡して、HTTP POST 相当のアクション処理をトリガーします。
   *
   * @param target 送信するフォームデータです。
   * @param options POST 送信用のオプションです。
   */
  (target: ReadonlyFormData, options?: SubmitPostOptions): void;

  /**
   * 不変のクエリーパラメーターを引き渡して、HTTP GET 相当の検索条件の更新をトリガーします。
   *
   * @param target 送信する検索クエリーです。
   * @param options GET 送信用のオプションです。
   */
  (target: ReadonlyURLSearchParams, options?: SubmitGetOptions): void;

  /**
   * 内部実装および包括的なユースケースに対応する汎用シグニチャーです。
   *
   * @param target 送信対象のデータです。
   * @param options 送信時に使用するオプションです。
   */
  (
    target: ReadonlyURLSearchParams | ReadonlyFormData,
    options?: SubmitGetOptions | SubmitPostOptions,
  ): void;
}

/**
 * ユーザーのクリックイベントや、特定のロジックに基づくタイミングで、プログラムから宣言的、命令的にサブミット処理（データ送信および遷移）を実行するための関数を取得するカスタムフックです。
 *
 * 渡されたペイロードが `FormData` であるか `URLSearchParams` であるかをランタイムで自動判定し、対応するルーティングエンジンメソッドへ送信します。
 * 判定ロジックは `@pera1/core` の `toSubmitArgs` に委譲しており、Solid.js 版とも共有されます。
 *
 * @returns 依存関係が最適化され、同一参照が保証された `submit` 関数を返します。
 */
export default function useSubmit(): SubmitFunction {
  const formAction = useFormAction();
  const routerSubmit = useRouterContext((router) => router.submit);

  // レンダリングごとに参照が変わって子コンポーネントが不要に再描画されるのを防ぐため、`useCallback` でラップします。
  return React.useCallback(
    function submit(target, options = {}) {
      return routerSubmit(toSubmitArgs(target, formAction, options));
    },
    [routerSubmit, formAction],
  );
}

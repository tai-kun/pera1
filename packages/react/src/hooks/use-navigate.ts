import type { NavigateOptions, NavigateTo } from "@pera1/core";
import { toNavigateArgs } from "@pera1/core";
import * as React from "react";

import useRouterContext from "./use-router-context.js";

export type { NavigateOptions, NavigateTo };

/**
 * プログラムから命令的に画面遷移を実行する、`NavigateFunction` 関数のオーバーロードインターフェース定義です。
 */
export interface NavigateFunction {
  /**
   * 指定されたアドレスへ画面を遷移させます。
   *
   * @param to 遷移先の対象となるデータ表現です。
   * @param options 履歴のスタック方法などを制御するオプションです。
   */
  (to: NavigateTo, options?: NavigateOptions): void;

  /**
   * ブラウザーのセッション履歴スタック内を、現在地を基準に相対移動させます。
   *
   * @param delta 移動する履歴のステップ数（例: `-1` で1つ戻る、`1` で1つ進む）です。
   */
  (delta: number): void;
}

/**
 * リンクなどを介さない、ボタンのクリックハンドラーや非同期処理の完了時などから、プログラムによって命令的に画面遷移や履歴移動をトリガーするための関数を取得するカスタムフックです。
 *
 * 引数の正規化は `@pera1/core` の `toNavigateArgs` に委譲しており、Solid.js 版とも共有されます。
 *
 * @returns `NavigateFunction` 関数です。
 */
export default function useNavigate(): NavigateFunction {
  const routerNavigate = useRouterContext((router) => router.navigate);

  // レンダリング毎に関数の参照が変わって子コンポーネントが不要に再描画されるのを防ぐため、useCallback でラップします。
  return React.useCallback(
    function navigate(...args: [NavigateTo, options?: NavigateOptions | undefined] | [number]) {
      return routerNavigate(toNavigateArgs(args[0] as NavigateTo | number, args[1]));
    },
    [routerNavigate],
  );
}

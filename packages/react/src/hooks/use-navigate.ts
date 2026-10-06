import type { NavigateOptions, NavigateTo } from "@pera1/core";
import { toNavigateArgs } from "@pera1/core";
import * as React from "react";

import log from "../_logger.js";
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
   * @param delta 移動する履歴のステップ数（例: `-1` で 1 つ戻る、`1` で 1 つ進む）です。
   */
  (delta: number): void;
}

/**
 * リンクなどを介さない、ボタンのクリックハンドラーや非同期処理の完了したときなどから、プログラムによって命令的に画面遷移や履歴移動をトリガーするための関数を取得するカスタムフックです。
 *
 * 引数の正規化は `@pera1/core` の `toNavigateArgs` に委譲しており、Solid.js 版とも共有されます。
 *
 * @returns 画面遷移を実行する `NavigateFunction` 関数を返します。
 */
export default function useNavigate(): NavigateFunction {
  const routerNavigate = useRouterContext((router) => router.navigate);

  // レンダリングごとに参照が変わって子コンポーネントが不要に再描画されるのを防ぐため、`useCallback` でラップします。
  return React.useCallback(
    function navigate(...args: [NavigateTo, options?: NavigateOptions | undefined] | [number]) {
      const navigateArgs = toNavigateArgs(args[0] as NavigateTo | number, args[1]);
      if (navigateArgs.type === "MOVE") {
        log.debug("履歴を移動します（delta: {delta}）", { delta: navigateArgs.delta });
      } else if (navigateArgs.to.type === "STATIC") {
        log.debug("画面遷移します（to: {to}, history: {history}）", {
          to: navigateArgs.to.path,
          history: navigateArgs.history,
        });
      } else {
        log.debug("画面遷移します（history: {history}）", { history: navigateArgs.history });
      }
      return routerNavigate(navigateArgs);
    },
    [routerNavigate],
  );
}

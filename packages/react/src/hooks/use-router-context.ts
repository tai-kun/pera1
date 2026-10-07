import { RouterContextMissingError } from "@pera1/core";
import { use, useSyncExternalStore } from "react";

import log from "../_logger.js";
import RouterContext, { type RouterRef } from "../contexts/router-context.js";

/**
 * グローバルなルーターの状態から、必要なデータの一部（スライス）をセレクター関数を介して選択的、効率的に購読するためのカスタムフックです。
 *
 * ルーターコンポーネントの配下で実行されていない場合はエラーを投げます。
 *
 * @template TSlice セレクター関数によって抽出される、コンポーネントが必要とする部分データです。
 * @param selector ルーターの内部実体を受け取り、必要なプロパティーや状態を抽出して返す純粋関数です。
 * @returns 選択され、外部ストアと同期された最新のスライスデータを返します。
 */
export default function useRouterContext<TSlice>(
  selector: (router: RouterRef["current"]) => TSlice,
): TSlice {
  const routerContext = use(RouterContext);
  if (!routerContext) {
    log.debug("RouterContext が見つかりません");

    throw new RouterContextMissingError();
  }

  const { routerRef, subscribe } = routerContext;

  return useSyncExternalStore(subscribe, () => selector(routerRef.current));
}

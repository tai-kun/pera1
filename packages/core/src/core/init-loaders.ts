import { NinjaPromise } from "ninja-promise";

import type { HistoryEntryUrl } from "./history-entry-url-schema.js";
import type { MatchedRoute } from "./match-routes.js";
import RouteRequest from "./route-request.js";
import type { LoaderFunction } from "./route.types.js";

/**
 * 各ローダー関数を初期化する際に必要となるリクエスト情報の型定義です。
 */
export type LoaderInitRequest = {
  /**
   * 読み込み対象となる現在の履歴エントリーの正規化済み URL オブジェクトです。
   */
  readonly url: HistoryEntryUrl;

  /**
   * 進行中の非同期データ取得処理を外部から中断するための中断シグナルです。
   */
  readonly signal: AbortSignal;
};

/**
 * マッチしたすべてのルートに紐づくデータ取得用のローダー関数を一斉に起動し、その実行コンテキストと遅延非同期状態を管理するためのマップを作成して返す関数です。
 *
 * 階層的な並行データフェッチをサポートするために、各ローダーの実行結果を個別のプロミスとしてラップします。
 *
 * @param routes 現在の URL にマッチしたルート情報の配列です。各ルートから `loader` 関数と解析済みの `params` のみを抽出して利用します。
 * @param request 各ローダー関数を初期化する際に必要となるリクエスト情報です。
 * @returns 各ローダー関数をキーとし、その実行結果または進行状態を表す `NinjaPromise` を値としたマップです。
 */
export default function initLoaders(
  routes: readonly Pick<MatchedRoute, "loader" | "params">[],
  request: LoaderInitRequest,
): Map<LoaderFunction, NinjaPromise<unknown>> {
  const dataMap = new Map<LoaderFunction, NinjaPromise<unknown>>();

  // マッチしたすべてのローダーで共有可能なリクエストオブジェクトを 1 つだけ作成します。
  // すべてのプロパティーが読み取り専用なので、ローダー間で共有できます。
  const req = RouteRequest.new("GET", request.url, request.signal);

  for (const { loader, params } of routes) {
    if (typeof loader !== "function") {
      continue;
    }

    const data = NinjaPromise.try(function executeLoader() {
      return loader({
        params,
        request: req,
      });
    });
    dataMap.set(loader, data);
  }

  return dataMap;
}

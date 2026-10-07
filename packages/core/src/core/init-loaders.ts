import { NinjaPromise } from "ninja-promise";

import log from "../_logger.js";
import hideLoaderRedirect from "./_hide-loader-redirect.js";
import type { HistoryEntryUrl } from "./history-entry-url-schema.js";
import type { MatchedRoute } from "./match-routes.js";
import RedirectResponse from "./redirect-response.js";
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
 * 初期化されたローダー群の公開用マップと完了待機処理の組です。
 */
export type InitializedLoaders = {
  /**
   * コンポーネント公開用のローダーデータマップです。
   */
  readonly dataMap: Map<LoaderFunction, NinjaPromise<unknown>>;

  /**
   * 全ローダーの完了を待ち、リダイレクト要求を回収します。
   */
  readonly idle: () => Promise<{ readonly redirectTo: RedirectResponse | undefined }>;
};

/**
 * マッチしたすべてのルートに紐づくデータ取得用のローダー関数を一斉に起動し、その実行コンテキストと遅延非同期状態を管理するためのマップを作成して返す関数です。
 *
 * 階層的な並行データフェッチをサポートするために、各ローダーの実行結果を個別のプロミスとしてラップします。
 *
 * ローダーが `RedirectResponse` を返した場合は `null` に置き換えて公開します。
 *
 * コンポーネント側へ `RedirectResponse` を露出させません。
 *
 * エンジンは `idle()` の戻り値で自動遷移します。
 *
 * @param routes 現在の URL にマッチしたルート情報の配列です。
 * @param request 各ローダー関数を初期化する際に必要となるリクエスト情報です。
 * @returns 公開用マップと完了待機処理の組を返します。
 */
export default function initLoaders(
  routes: readonly Pick<MatchedRoute, "loader" | "params">[],
  request: LoaderInitRequest,
): InitializedLoaders {
  const dataMap = new Map<LoaderFunction, NinjaPromise<unknown>>();
  const rawPromises: NinjaPromise<unknown>[] = [];
  // マッチしたすべてのローダーで共有可能なリクエストオブジェクトを 1 つだけ作成します。
  const req = RouteRequest.new("GET", request.url, request.signal);
  for (const { loader, params } of routes) {
    if (typeof loader !== "function") {
      continue;
    }
    const raw = NinjaPromise.try(function executeLoader() {
      return loader({
        params,
        request: req,
      });
    });
    rawPromises.push(raw);
    dataMap.set(loader, hideLoaderRedirect(raw));
  }
  log.debug("初期ローダーを起動しました（url: {url}, 件数: {count}）", {
    url: request.url.href,
    count: dataMap.size,
  });
  return {
    dataMap,
    async idle() {
      const results = await Promise.allSettled(rawPromises);
      for (const result of results) {
        if (result.status === "fulfilled" && result.value instanceof RedirectResponse) {
          log.debug("ローダーがリダイレクトを返しました（to: {to}）", {
            to: `${result.value.pathname}${result.value.search}${result.value.hash}`,
          });
          return { redirectTo: result.value };
        }
      }
      return { redirectTo: undefined };
    },
  };
}

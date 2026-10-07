import { LoaderDataNotFoundError, selectLoaderData } from "@pera1/core";
import type { RedirectResponse } from "@pera1/core";
import type { NinjaPromise } from "ninja-promise";

import log from "../_logger.js";
import useRouteContext from "./use-route-context.js";
import useRouterContext from "./use-router-context.js";

/**
 * ローダー関数またはデータ型から、最終的に解決されるデータの型を抽出するユーティリティー型です。
 *
 * ローダーが `redirect()` を返した場合はエンジンが自動遷移させ、コンポーネント側へ露出させません。
 *
 * そのため戻り値の型から `RedirectResponse` を取り除きます。
 *
 * @template TData ローダー関数、または解決されるデータの型です。
 */
export type FulfilledLoaderData<TData = unknown> = Exclude<
  Awaited<TData extends (...args: any) => infer TReturn ? TReturn : TData>,
  RedirectResponse
>;
/**
 * {@link useLoaderData|`useLoaderData`} カスタムフックが返すオブジェクトの型定義です。
 *
 * 非同期処理の進行状況を管理する `NinjaPromise` でラップされた、解決済みのデータ型を表します。
 *
 * @template TData ローダー関数、またはローダーが返すデータの型定義です。
 */
export type LoaderData<TData = unknown> = NinjaPromise<FulfilledLoaderData<TData>>;

/**
 * 現在の階層のルートに紐づくローダー関数の実行結果を購読し、取得するためのカスタムフックです。
 *
 * データの選択ロジック自体は `@pera1/core` の `selectLoaderData` に委譲します。
 *
 * ローダーが `redirect()` を返した場合はエンジンが自動遷移させ、コンポーネント側へ露出させません。
 *
 * リダイレクト時は解決を待たせてサスペンスを維持するため、描画側の分岐は不要です。
 *
 * @template TData ローダー関数そのものの型、またはローダーが返すことが期待されるデータ構造の型定義です。
 * @returns ローダーの実行状態を管理している `NinjaPromise` を返します。
 */
export default function useLoaderData<TData = unknown>(): LoaderData<TData> {
  const { loader, urlPath } = useRouteContext();
  const loaderData = useRouterContext((router) => selectLoaderData(router, loader));
  if (!loaderData) {
    log.debug("ローダーデータが見つかりません（path: {path}, loader: {loader}）", {
      path: urlPath,
      loader: loader?.name || "anonymous",
    });
    throw new LoaderDataNotFoundError({ loader });
  }

  return loaderData satisfies LoaderData<unknown> as LoaderData<any>;
}

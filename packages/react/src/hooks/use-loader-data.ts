import { LoaderDataNotFoundError, selectLoaderData } from "@pera1/core";
import type { RedirectResponse } from "@pera1/core";
import type { NinjaPromise } from "ninja-promise";

import log from "../_logger.js";
import useRouteContext from "./use-route-context.js";
import useRouterContext from "./use-router-context.js";

/**
 * ローダーの戻り値からリダイレクト応答を `null` に変換するユーティリティー型です。
 *
 * ランタイムの置き換えに合わせて、型レベルでも `RedirectResponse` を露出させません。
 */
type LoaderResult<TResult> = TResult extends RedirectResponse ? null : TResult;

/**
 * ローダー関数またはデータ型から、最終的に解決されるデータの型を抽出するユーティリティー型です。
 *
 * ローダーが `redirect()` を返した場合はエンジンが自動遷移させ、コンポーネント側には `null` が届きます。
 *
 * 描画側では `null` の場合に `null` を返す分岐を残しておきます。
 *
 * @template TData ローダー関数、または解決されるデータの型です。
 */
export type FulfilledLoaderData<TData = unknown> = LoaderResult<
  Awaited<TData extends (...args: any) => infer TReturn ? TReturn : TData>
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
 * ローダーが `redirect()` を返した場合はエンジンが自動遷移させ、コンポーネント側には `null` が届きます。
 *
 * 描画側では次の分岐を残しておきます。
 *
 * ```tsx
 * const data = React.use(useLoaderData<typeof loader>());
 * if (data === null) {
 *   return null;
 * }
 * ```
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

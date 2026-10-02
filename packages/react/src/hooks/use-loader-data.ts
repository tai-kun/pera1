import { LoaderDataNotFoundError, selectLoaderData } from "@pera1/core";
import type { NinjaPromise } from "ninja-promise";

import useRouteContext from "./use-route-context.js";
import useRouterContext from "./use-router-context.js";

/**
 * ローダー関数またはデータ型から、最終的に解決されるデータの型を抽出するユーティリティー型です。
 *
 * @template TData ローダー関数、または解決されるデータの型です。
 */
export type FulfilledLoaderData<TData = unknown> = Awaited<
  TData extends (...args: any) => infer TReturn ? TReturn : TData
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
 * 現在の階層のルートに紐づくローダー関数の実行結果を購読・取得するためのカスタムフックです。
 *
 * データの選択ロジック自体は `@pera1/core` の `selectLoaderData` に委譲しており、Solid.js 版とも共有されます。
 *
 * @template TData ローダー関数そのものの型、またはローダーが返すことが期待されるデータ構造の型定義です。関数型が渡された場合は、自動的にその非同期戻り値の型が推論されます。
 * @returns ローダーの実行状態を管理している `NinjaPromise` を返します。
 */
export default function useLoaderData<TData = unknown>(): LoaderData<TData> {
  const { loader } = useRouteContext();
  const loaderData = useRouterContext((router) => selectLoaderData(router, loader));
  if (!loaderData) {
    throw new LoaderDataNotFoundError({ loader });
  }

  return loaderData satisfies LoaderData<unknown> as LoaderData<any>;
}

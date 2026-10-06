import { LoaderDataNotFoundError, selectLoaderData } from "@pera1/core";
import type { NinjaPromise } from "ninja-promise";

import log from "../_logger.js";
import useRouteContext from "./use-route-context.js";
import useRouterContext from "./use-router-context.js";

/**
 * ローダー関数またはデータ型から、最終的に解決されるデータの型を抽出するユーティリティー型です。
 *
 * ローダーが `redirect()` (`RedirectResponse`) を返した場合はエンジンが自動遷移させるため、
 * コンポーネントには通常到達しません。ただし初回表示の解決前など、遷移が間に合わない
 * 場合に備えて、戻り値の型には `RedirectResponse` が含まれたままになります。
 * 描画側では `data instanceof RedirectResponse` の場合に `null` を返すなどの
 * フォールバックを残しておくと安全です。
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
 * 現在の階層のルートに紐づくローダー関数の実行結果を購読し、取得するためのカスタムフックです。
 *
 * データの選択ロジック自体は `@pera1/core` の `selectLoaderData` に委譲しており、Solid.js 版とも共有されます。
 *
 * ローダーが `redirect()` を返した場合、エンジンが `startLoaders` の完了時に検出して
 * 自動遷移します (`redirect.ts` を参照)。アクションの `redirect()` と対称的な振る舞いです。
 * 解決値が `RedirectResponse` のまま届くのは、初回表示など遷移が間に合わない場合に限られる
 * ため、描画側では次のフォールバックを残しておくことを推奨します。
 *
 * ```tsx
 * const data = React.use(useLoaderData<typeof loader>());
 * if (data instanceof RedirectResponse) {
 *   return null;
 * }
 * ```
 *
 * @template TData ローダー関数そのものの型、またはローダーが返すことが期待されるデータ構造の型定義です。関数型が渡された場合は、自動的にその非同期戻り値の型が推論されます。
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

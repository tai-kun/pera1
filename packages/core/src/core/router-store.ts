import type { NinjaPromise } from "ninja-promise";

import type { RouterSnapshot } from "./create-router.js";
import type { ActionFunction, LoaderFunction } from "./route.types.js";

/**
 * ルーターのスナップショットから、現在の履歴エントリーに紐づくアクションの実行状態を取得します。
 *
 * `useActionData` や将来の Solid.js 版で共有するための純粋なセレクター関数です。
 *
 * @param snapshot `createRouter` が返すコントローラーのスナップショットです。
 * @param action 対象のアクション関数です。未定義の場合は `undefined` を返します。
 * @returns アクションが実行済みまたは実行中であれば結果を内包した `NinjaPromise` を返し、未実行の場合は `undefined` を返します。
 */
export function selectActionData(
  snapshot: Pick<RouterSnapshot, "currentEntry" | "actionDataStore">,
  action: ActionFunction | undefined,
): NinjaPromise<unknown> | undefined {
  if (typeof action !== "function") {
    return undefined;
  }
  return snapshot.actionDataStore.get(snapshot.currentEntry.id)?.get(action);
}

/**
 * ルーターのスナップショットから、現在の履歴エントリーに紐づくローダーの実行状態を取得します。
 *
 * `useLoaderData` や将来の Solid.js 版で共有するための純粋なセレクター関数です。
 *
 * @param snapshot `createRouter` が返すコントローラーのスナップショットです。
 * @param loader 対象のローダー関数です。未定義の場合は `undefined` を返します。
 * @returns ローダーの実行状態を管理している `NinjaPromise`、または未実行の場合は `undefined` を返します。
 */
export function selectLoaderData(
  snapshot: Pick<RouterSnapshot, "currentEntry" | "loaderDataStore">,
  loader: LoaderFunction | undefined,
): NinjaPromise<unknown> | undefined {
  if (typeof loader !== "function") {
    return undefined;
  }
  return snapshot.loaderDataStore.get(snapshot.currentEntry.id)?.get(loader);
}

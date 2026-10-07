import type { NinjaPromise } from "ninja-promise";

import type { RouterSnapshot } from "./create-router.js";
import type { HistoryEntryId } from "./history-entry-id-schema.js";
import type { ActionFunction, LoaderFunction } from "./route.types.js";

/**
 * `useNavigation` が返す遷移状態です。
 *
 * - `"idle"`: 進行中の遷移がありません。
 * - `"loading"`: GET 遷移によりいずれかのローダーが実行中です。
 * - `"submitting"`: POST によりいずれかのアクションが実行中です。
 */
export type NavigationState = "idle" | "loading" | "submitting";

/**
 * ルーターのスナップショットから、現在の履歴エントリーに紐づく遷移状態を導出します。
 *
 * `useNavigation` や将来の Solid.js 版で共有するための純粋なセレクター関数です。
 * エンジンがアクション開始時に `update()` 素通しで再描画を通知する仕組みを利用し、ストア上の `NinjaPromise` の `status` を走査して判定します。
 *
 * 優先順位はアクション (`"submitting"`) がローダー (`"loading"`) より高く、いずれにも `pending` がなければ `"idle"` を返します。
 * スナップショットが未初期化の場合も `"idle"` を返します。
 *
 * @param snapshot `createRouter` が返すコントローラーのスナップショットです。
 * @returns 現在の遷移状態を表す `"idle"`、`"loading"`、`"submitting"` のいずれかです。
 */
export function selectNavigationState(
  snapshot: Pick<RouterSnapshot, "currentEntry" | "actionDataStore" | "loaderDataStore">,
): NavigationState {
  const entryId = (snapshot as { currentEntry?: { id?: unknown } }).currentEntry?.id as
    | HistoryEntryId
    | undefined;
  if (!entryId) {
    return "idle";
  }

  const actionMap = (
    snapshot as {
      actionDataStore?: ReadonlyMap<HistoryEntryId, ReadonlyMap<unknown, { status?: string }>>;
    }
  ).actionDataStore?.get(entryId);
  if (actionMap) {
    for (const data of actionMap.values()) {
      if ((data as { status?: string } | undefined)?.status === "pending") {
        return "submitting";
      }
    }
  }

  const loaderMap = (
    snapshot as {
      loaderDataStore?: ReadonlyMap<HistoryEntryId, ReadonlyMap<unknown, { status?: string }>>;
    }
  ).loaderDataStore?.get(entryId);
  if (loaderMap) {
    for (const data of loaderMap.values()) {
      if ((data as { status?: string } | undefined)?.status === "pending") {
        return "loading";
      }
    }
  }

  return "idle";
}

/**
 * ルーターのスナップショットから、現在の履歴エントリーに紐づくアクションの実行状態を取得します。
 *
 * `useActionData` や将来の Solid.js 版で共有するための純粋なセレクター関数です。
 *
 * @param snapshot `createRouter` が返すコントローラーのスナップショットです。
 * @param action 対象のアクション関数です。
 * 未定義の場合は `undefined` を返します。
 * @returns アクションが実行済みまたは実行中であれば結果を内包した `NinjaPromise` を返します。
 * 未実行の場合は `undefined` を返します。
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
 * @param loader 対象のローダー関数です。
 * 未定義の場合は `undefined` を返します。
 * @returns ローダーの実行状態を管理している `NinjaPromise` を返します。
 * 未実行の場合は `undefined` を返します。
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

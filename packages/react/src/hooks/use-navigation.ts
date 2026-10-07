import { RouterContextMissingError, selectNavigationState } from "@pera1/core";
import type { NavigationState } from "@pera1/core";
import * as React from "react";

import log from "../_logger.js";
import RouterContext from "../contexts/router-context.js";

export type { NavigationState };

/**
 * {@link useNavigation|`useNavigation`} カスタムフックが返すオブジェクトです。
 */
export type Navigation = {
  /**
   * 現在の遷移状態です。
   *
   * - `"idle"`: 進行中の遷移がありません。
   * - `"loading"`: GET 遷移によりいずれかのローダーが実行中です。
   * - `"submitting"`: POST によりいずれかのアクションが実行中です。
   */
  readonly state: NavigationState;
};

/**
 * 現在の履歴エントリーに紐づくアクションとローダーの `NinjaPromise` の状態から、遷移状態 (`"idle"`、`"loading"`、`"submitting"`) を宣言的に取得するためのカスタムフックです。
 *
 * 判定ロジック自体は `@pera1/core` の `selectNavigationState` に委譲しており、エンジンがアクション開始のときに `update()` 素通しで再描画を通知する仕組みを利用します。
 * ローダーの完了はエンジンからの再通知がないため、本フックが pending の確定を待って自発的に再描画し、`"loading"` から `"idle"` へ戻します。
 *
 * `Suspense` のフォールバックと併用できます。
 * 粒度の指針は `examples/blog/src/pages/root.tsx` のコメントとガイドを参照してください。
 *
 * ```tsx
 * function PendingBar() {
 *   const navigation = useNavigation();
 *   if (navigation.state === "idle") {
 *     return null;
 *   }
 *   return <p role="status">読み込み中…</p>;
 * }
 * ```
 *
 * @returns 現在の遷移状態を内包したオブジェクトを返します。
 */
export default function useNavigation(): Navigation {
  const routerContext = React.use(RouterContext);
  if (!routerContext) {
    log.debug("RouterContext が見つかりません");
    throw new RouterContextMissingError();
  }

  const { routerRef, subscribe } = routerContext;

  // ルーターの更新通知ごとに `selectNavigationState` を再評価します。
  // `getSnapshot` はプリミティブな状態文字列を返すため、キャッシュ不要で比較可能です。
  const state = React.useSyncExternalStore(subscribe, () =>
    selectNavigationState(routerRef.current as never),
  );

  // ローダーの完了のときにエンジンからの再通知はないため、pending の確定を待って自発的に再描画します。
  const [, bump] = React.useReducer((count: number) => count + 1, 0);
  const entryId = (routerRef.current as { currentEntry?: { id?: string } } | null)?.currentEntry
    ?.id;

  React.useEffect(() => {
    if (state === "idle") {
      return;
    }
    const snapshot = routerRef.current as unknown as {
      currentEntry?: { id?: unknown };
      actionDataStore?: Map<unknown, Map<unknown, PromiseLike<unknown> & { status?: string }>>;
      loaderDataStore?: Map<unknown, Map<unknown, PromiseLike<unknown> & { status?: string }>>;
    } | null;
    const currentId = snapshot?.currentEntry?.id;
    if (!currentId) {
      return;
    }
    const pending: PromiseLike<unknown>[] = [];
    for (const store of [snapshot?.actionDataStore, snapshot?.loaderDataStore]) {
      const map = store?.get(currentId);
      if (!map) {
        continue;
      }
      for (const data of map.values()) {
        if ((data as { status?: string }).status === "pending") {
          pending.push(data);
        }
      }
    }
    if (pending.length === 0) {
      return;
    }

    let cancelled = false;
    void Promise.allSettled(pending).then(() => {
      if (!cancelled) {
        bump();
      }
    });
    return () => {
      cancelled = true;
    };
  }, [state, entryId, routerRef]);

  return React.useMemo(() => ({ state }), [state]);
}

import type { NinjaPromise } from "ninja-promise";

import log from "../_logger.js";
import type { IEngine } from "../engines/engine.types.js";
import type { RouterState } from "../engines/engine.types.js";
import processRoutes from "./_process-routes.js";
import type { HistoryEntry } from "./expect-history-entry.js";
import type { HistoryEntryId } from "./history-entry-id-schema.js";
import type { MatchedRoute } from "./match-routes.js";
import type { ActionFunction, LoaderFunction, RouteDefinition } from "./route.types.js";

/**
 * ルーターのスナップショット（`routerRef.current` 相当）の形状定義です。
 *
 * React の `RefObject` や Solid.js のシグナルなど、特定フレームワークのリアクティブプリミティブに依存せず、
 * すべての UI バインディング（`@pera1/react`、将来の `@pera1/solid` など）で共有できる純粋なデータ形状です。
 */
export type RouterSnapshot = {
  /**
   * フォームデータやクエリーパラメーターをルーターに送信するための関数です。
   */
  readonly submit: (args: IEngine.SubmitArgs) => void;

  /**
   * URL 遷移や履歴スタックの相対移動をルーターに命令するための関数です。
   */
  readonly navigate: (args: IEngine.NavigateArgs) => void;

  /**
   * 現在ブラウザー上でアクティブになっている履歴エントリーの情報です。
   */
  readonly currentEntry: HistoryEntry;

  /**
   * 履歴エントリーの ID ごとにアクションの実行状態を管理するデータストアです。
   */
  readonly actionDataStore: ReadonlyMap<
    HistoryEntryId,
    ReadonlyMap<ActionFunction, NinjaPromise<unknown>>
  >;

  /**
   * 履歴エントリーの ID ごとにローダーの実行状態を管理するデータストアです。
   */
  readonly loaderDataStore: ReadonlyMap<
    HistoryEntryId,
    ReadonlyMap<LoaderFunction, NinjaPromise<unknown>>
  >;
};

/**
 * `createRouter` に渡す引数の型定義です。
 *
 * @template TComponent 描画対象となるコンポーネントの型です。
 */
export type CreateRouterArgs<TComponent = any> = {
  /**
   * プラグイン形式で差し込まれる、ルーティングの実装です。
   */
  readonly engine: IEngine<TComponent>;

  /**
   * ユーザーがアプリケーションに定義したルート定義の配列です。
   */
  readonly routes: readonly RouteDefinition<string, TComponent>[];
};

/**
 * フレームワークに依存しないルーターコントローラーのインターフェースです。
 *
 * `Router` コンポーネントや将来の Solid.js バインディングは、このコントローラーを
 * `useMemo` / `createMemo` などで保持し、`subscribe` + スナップショット取得関数と組み合わせて購読します。
 *
 * @template TComponent 描画対象となるコンポーネントの型です。
 */
export interface RouterController<TComponent = any> {
  /**
   * エンジンによるイベントのリアルタイム監視を開始します。
   *
   * @returns 監視を停止し、リソースを解放するためのクリーンアップ関数を返します。
   */
  readonly start: () => () => void;

  /**
   * ルーターの状態変更を監視するための購読関数です。
   *
   * @param onRouterChange ルーターの内部状態が変化した際に実行されるコールバック関数です。
   * @returns 監視を安全に解除するためのクリーンアップ関数を返します。
   */
  readonly subscribe: (onRouterChange: () => void) => () => void;

  /**
   * 現在マッチしているルート階層配列を取得します。
   *
   * @returns マッチしたルート配列、またはマッチなし（404 相当）の場合は `undefined` を返します。
   */
  readonly getRoutes: () => readonly MatchedRoute<TComponent>[] | undefined;

  /**
   * ルーターの最新スナップショットを取得します。
   *
   * スナップショットオブジェクト自体の参照は安定しており、内部の `currentEntry` のみが更新されます。
   */
  readonly getSnapshot: () => RouterSnapshot;
}

/**
 * 宣言的なルート定義と命令的なルーティング実行エンジンを仲介し、統合し、
 * フレームワークに依存しないルーターのライフサイクルと状態管理を司るコントローラーを作成します。
 *
 * 元々 `Router` コンポーネントの内部に閉じていたロジックを抽出したもので、
 * React（`useSyncExternalStore`）でも Solid.js（`createEffect` + `on`）でも同じ振る舞いを再利用できます。
 *
 * @template TComponent 描画対象となるコンポーネントの型です。
 * @param args エンジンとルート定義を含む引数オブジェクトです。
 * @returns ライフサイクル管理、購読、スナップショット取得のためのコントローラーです。
 */
export default function createRouter<TComponent = any>(
  args: CreateRouterArgs<TComponent>,
): RouterController<TComponent> {
  const { engine, routes: routesProp } = args;

  const actionDataStore = new Map<HistoryEntryId, Map<ActionFunction, NinjaPromise<unknown>>>();
  const loaderDataStore = new Map<HistoryEntryId, Map<LoaderFunction, NinjaPromise<unknown>>>();
  const subscribers = new Set<() => void>();
  const routes = processRoutes(routesProp);
  let ac: AbortController | null = null;

  log.debug("Routerを作成します（定義数: {definitionCount}, 正規化数: {routeCount}）", {
    definitionCount: routesProp.length,
    routeCount: routes.length,
  });

  /**
   * 現在のフェーズで有効な、シングルトン構造の中断シグナルをオンデマンドで生成し、回収します。
   */
  function getAbortSignal(): AbortSignal {
    return (ac ||= new AbortController()).signal;
  }

  // エンジンを初期化し、初期ロード時のマッチングルートおよび解決済みのデータマップを取得し、登録します。
  const initialState = engine.init({
    routes,
    getSignal: getAbortSignal,
    loaderDataStore,
  });
  let currentRoutes = initialState?.routes as readonly MatchedRoute<TComponent>[] | undefined;

  if (initialState) {
    log.debug("初期状態を確定しました（url: {url}, id: {id}, 一致数: {matchedCount}）", {
      url: initialState.entry.url.href,
      id: initialState.entry.id,
      matchedCount: initialState.routes.length,
    });
  } else {
    log.debug("初期状態は未マッチです（エントリーなしまたはルート不一致）");
  }

  const snapshot = {
    submit(submitArgs: IEngine.SubmitArgs): void {
      log.debug("submitを受信しました（type: {type}）", { type: submitArgs.type });
      return engine.submit(submitArgs);
    },
    navigate(navigateArgs: IEngine.NavigateArgs): void {
      log.debug("navigateを受信しました（type: {type}）", { type: navigateArgs.type });
      return engine.navigate(navigateArgs);
    },
    currentEntry: initialState?.entry as HistoryEntry,
    actionDataStore,
    loaderDataStore,
  } satisfies RouterSnapshot;

  /**
   * エンジン内部での遷移確定時に、状態を各 UI バインディングへ通知し、マージするための状態更新関数です。
   */
  function updateRouter(newState?: RouterState<TComponent> | null): void {
    if (newState !== undefined) {
      currentRoutes = newState?.routes;
    }
    if (newState) {
      (snapshot as { currentEntry: HistoryEntry }).currentEntry = newState.entry;
      log.debug("状態を更新しました（url: {url}, id: {id}, 一致数: {matchedCount}）", {
        url: newState.entry.url.href,
        id: newState.entry.id,
        matchedCount: newState.routes.length,
      });
    } else if (newState === null) {
      log.debug("未マッチ状態にリセットしました");
    } else {
      log.debug("現在の状態を維持したまま再描画します（購読者数: {subscriberCount}）", {
        subscriberCount: subscribers.size,
      });
    }

    // 状態変更の発生を、すべての購読者に一斉通知して再描画を促します。
    subscribers.forEach((notify) => notify());
  }

  /**
   * エンジンによるイベントのリアルタイム監視を開始するトリガー関数です。
   */
  function startRouterEngine(): () => void {
    log.debug("エンジンの監視を開始します");
    const stop = engine.start({
      routes,
      update: updateRouter,
      getSignal: getAbortSignal,
      actionDataStore,
      loaderDataStore,
    });

    return function stopRouterEngine(): void {
      log.debug("エンジンの監視を停止します");
      try {
        if (typeof stop === "function") {
          stop();
        }
      } finally {
        try {
          ac?.abort();
        } catch {
          // 中断時のエラーを無視します。
        }
        ac = null;
      }
    };
  }

  return {
    start: startRouterEngine,
    subscribe(cb: () => void): () => void {
      subscribers.add(cb);
      return () => {
        subscribers.delete(cb);
      };
    },
    getRoutes(): readonly MatchedRoute<TComponent>[] | undefined {
      return currentRoutes;
    },
    getSnapshot(): RouterSnapshot {
      return snapshot;
    },
  };
}

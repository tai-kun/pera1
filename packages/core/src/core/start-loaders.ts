import { NinjaPromise } from "ninja-promise";

import unreachable from "./_unreachable.js";
import { LoaderConditionError } from "./errors.js";
import type { HistoryEntry } from "./expect-history-entry.js";
import type { HistoryEntryId } from "./history-entry-id-schema.js";
import type { MatchedRoute } from "./match-routes.js";
import RouteRequest from "./route-request.js";
import type { LoaderFunction } from "./route.types.js";

/**
 * `startLoaders` 関数を実行する際に必要となる引数オブジェクトの型定義です。
 */
export type StartLoadersArgs = {
  /**
   * 遷移前にマッチしていたルート情報の配列です。
   */
  readonly prevRoutes: readonly Pick<MatchedRoute, "path" | "params">[] | null;

  /**
   * 遷移先の URL にマッチしている全ルート情報の配列です。
   */
  readonly currentRoutes: readonly Pick<
    MatchedRoute,
    "path" | "params" | "action" | "loader" | "shouldReload"
  >[];

  /**
   * 遷移前の履歴エントリー情報です。
   */
  readonly prevEntry: Pick<HistoryEntry, "id" | "url">;

  /**
   * 遷移先（現在）の履歴エントリー情報です。
   */
  readonly currentEntry: Pick<HistoryEntry, "id" | "url">;

  /**
   * 履歴エントリー ID ごとに、各ローダーの実行結果を多重管理しているグローバルなデータストアです。
   */
  readonly loaderDataStore: Map<HistoryEntryId, Map<LoaderFunction, NinjaPromise<unknown>>>;

  /** 進行中のローダーの非同期処理を外部から中断するためのシグナルオブジェクトです。 */
  readonly signal: AbortSignal;
};

/**
 * 直前にアクションが実行されていた場合に、追加の文脈として渡されるオプションオブジェクトの型定義です。
 */
export type StartLoadersOptions = {
  /**
   * アクション実行時に送信された標準のフォームデータです。
   */
  readonly formData: FormData;

  /**
   * 直前のアクション関数が返した実行結果データです。
   */
  readonly actionData: unknown;
};

/**
 * 起動されたローダー群のライフサイクルおよび完了待機を制御するインターフェースです。
 */
export interface StartedLoaders {
  /**
   * 現在のフェーズでスケジュールされたすべてのローダーの処理が完了するまで待機します。
   */
  idle: () => Promise<void>;
}

/**
 * 画面遷移やデータ更新の発生に伴い、現在マッチしているルートのローダー関数群を精査し、キャッシュの再利用または読み込みを動的に判定・実行する関数です。
 *
 * @param args ローダーの評価に必要な現旧のルートおよび履歴コンテキストです。
 * @param options 直前のアクション実行コンテキストを含むオプションです。
 * @returns スケジュールされたローダー全体の処理完了を待機するための `StartedLoaders` オブジェクトを返します。
 */
export default function startLoaders(
  args: StartLoadersArgs,
  options?: StartLoadersOptions,
): StartedLoaders {
  const { signal, prevEntry, prevRoutes, currentEntry, currentRoutes, loaderDataStore } = args;

  // アクション契機でのデータリロードであるか、通常の GET 遷移であるかを識別するためのコンテキストを構築します。
  const actionContext = options && {
    formData: options.formData,
    actionData: options.actionData,
  };

  // マッチした配列は「子ルート（詳細度高）」から「親ルート（詳細度低）」の順にソートされているため、先頭の要素から、ルート全体の動的パスパラメーターを一括して回収できます。
  const prevParams = prevRoutes?.[0]?.params || {};
  const prevRoutePathSet: ReadonlySet<string> = new Set(prevRoutes?.map((r) => r.path));

  // 遷移前の履歴 ID に紐づくローダーデータのキャッシュマップをストアから取得します。
  const prevLoaderDataMap: ReadonlyMap<LoaderFunction, NinjaPromise<unknown>> | undefined =
    loaderDataStore.get(prevEntry.id);

  // 今回の実行フェーズで収集・確定させる新しいローダーデータマップを初期化します。
  const currentLoaderDataMap = new Map<LoaderFunction, NinjaPromise<unknown>>();
  const request = RouteRequest.new("GET", currentEntry.url, signal);

  // 現在マッチしているすべてのルートセグメントを個別に精査します。
  for (const currentRoute of currentRoutes) {
    const { loader: currentLoader, params: currentParams, shouldReload } = currentRoute;

    // ローダー関数が定義されていないルートセグメントはスキップします。
    if (typeof currentLoader !== "function") {
      continue;
    }

    // 過去に同じローダー関数が実行され、かつそのキャッシュデータが存在するかをチェックします。
    const prevLoaderData = prevLoaderDataMap?.get(currentLoader);
    if (!prevLoaderData) {
      // 過去のキャッシュが存在しない＝今回新しくマッチした未知のルート階層であると判定し、判定の余地なく新規にローダーを起動します。
      const data = NinjaPromise.try(function executeLoader() {
        return currentLoader({
          params: currentParams,
          request,
        });
      });
      // ローダーの結果を待機、エラーハンドリングする処理は、この結果を参照するコンポーネントに任せます。
      currentLoaderDataMap.set(currentLoader, data);

      continue;
    }

    // キャッシュが存在する場合、ユーザー定義の `shouldReload` に照らし合わせて再読み込みが必要かを安全に検証します。
    const should = NinjaPromise.try(function executeShouldReload() {
      if (!actionContext) {
        // 通常の GET 遷移時における再読み込み判定用引数を組み立てて実行します。
        return shouldReload({
          prevUrl: prevEntry.url,
          currentUrl: currentEntry.url,
          prevParams,
          currentParams,
          triggerMethod: "GET",
          defaultShouldReload:
            // 検索クエリーに変更があれば既定値を true とします。
            prevEntry.url.search !== currentEntry.url.search ||
            // 遷移前のルート群に今回精査しているパスが含まれていなければ、新規表示扱いとして、既定値を true とします。
            !prevRoutePathSet.has(currentRoute.path),
        });
      } else {
        // フォームデータの送信を伴う更新契機の場合の判定引数です。
        return shouldReload({
          ...actionContext,
          prevUrl: prevEntry.url,
          currentUrl: currentEntry.url,
          prevParams,
          currentParams,
          triggerMethod: "POST",
          // データ更新後は原則として全再取得が安全なため、既定値を true とします。
          defaultShouldReload: true,
        });
      }
    });

    let data: NinjaPromise<unknown>;
    // `shouldReload` の同期的な実行結果に基づいて処理を分岐します。
    switch (should.status) {
      case "pending": {
        // shouldReload は仕様上「同期的」に真偽値を返す必要があります（Promise を返してはならない）。
        // もし pending であれば LoaderConditionError を生成して拒否状態のプロミスとしてラップします。
        const error = new LoaderConditionError({
          url: request.url.href,
          returnValue: should,
          shouldReload,
        });
        data = NinjaPromise.reject(error);
        break;
      }

      case "rejected":
        // shouldReload の実行中に同期的な例外が発生した場合は、そのエラー状態をそのまま引き継ぎ、ハンドリングを画面側に委ねます。
        data = should;
        break;

      case "fulfilled": {
        const { value } = should;
        switch (value) {
          case true:
            // 明示的にリロードの指示が出た場合のみ、ローダーを新規に再実行します。
            data = NinjaPromise.try(function executeLoader() {
              return currentLoader({
                params: currentParams,
                request,
              });
            });

            break;

          case false:
            // 再読み込みが不要（現状維持）と判定された場合は、前回のキャッシュプロミスをそのまま無加工で引き継ぎます。
            data = prevLoaderData;

            break;

          default: {
            // 戻り値が boolean 型（true / false）ではなかった場合、仕様不適合としてエラーを割り当てます。
            const error = new LoaderConditionError({
              url: request.url.href,
              returnValue: value,
              shouldReload,
            });
            // エラーハンドリングは、このローダーデータを参照するコンポーネントに任せます。
            data = NinjaPromise.reject(error);
          }
        }

        break;
      }

      default:
        unreachable(should);
    }

    // 確定したプロミスを今回のマップに登録します。
    currentLoaderDataMap.set(currentLoader, data);
  }

  // 今回の実行フェーズで収集・更新されたローダーデータが存在する場合、グローバルなキャッシュストアへマージして永続化します。
  if (currentLoaderDataMap.size > 0) {
    loaderDataStore.set(
      currentEntry.id,
      new Map([...(loaderDataStore.get(currentEntry.id) || []), ...currentLoaderDataMap]),
    );
  }

  return {
    async idle() {
      await Promise.allSettled(currentLoaderDataMap.values());
    },
  };
}

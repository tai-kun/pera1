import { NinjaPromise } from "ninja-promise";

import log from "../_logger.js";
import hideLoaderRedirect from "./_hide-loader-redirect.js";
import unreachable from "./_unreachable.js";
import { LoaderConditionError } from "./errors.js";
import type { HistoryEntry } from "./expect-history-entry.js";
import type { HistoryEntryId } from "./history-entry-id-schema.js";
import type { MatchedRoute } from "./match-routes.js";
import RedirectResponse from "./redirect-response.js";
import RouteRequest from "./route-request.js";
import type { LoaderFunction, RouteParams } from "./route.types.js";

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
   * 現在の遷移先の履歴エントリー情報です。
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
   *
   * いずれかのローダーが `RedirectResponse` を返した場合は最初に検出されたものを `redirectTo` として返します。
   *
   * 呼び出し側はこの値を使って自動遷移を行ってください。
   *
   * 検出された `RedirectResponse` は公開マップには格納されません。
   *
   * コンポーネント側には解決されないプロミスが渡ります。
   *
   * @returns 処理結果に伴うリダイレクト要求を含むオブジェクトを返します。
   */
  idle: () => Promise<{
    redirectTo: RedirectResponse | undefined;
  }>;
}

/**
 * 2 つの params オブジェクトが浅い等価性で一致するかを判定します。
 *
 * キーの和集合に対して `!==` で比較します。
 *
 * キーの有無の違いは等価とみなします。
 */
function areParamsEqual(a: RouteParams, b: RouteParams): boolean {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);

  for (const key of keys) {
    if (a[key] !== b[key]) {
      return false;
    }
  }

  return true;
}

/**
 * 画面遷移やデータ更新の発生に伴い、現在マッチしているルートのローダー関数群を精査する関数です。
 *
 * キャッシュの再利用または読み込みを動的に判定し、実行します。
 *
 * ローダーが `RedirectResponse` を返した場合は解決されないプロミスとして公開します。
 *
 * エンジンは `idle()` の戻り値で自動遷移します。
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

  log.debug(
    "ローダーを評価します（trigger: {trigger}, from: {from} -> to: {to}, 対象数: {count}）",
    {
      trigger: actionContext ? "POST" : "GET",
      from: prevEntry.url.href,
      to: currentEntry.url.href,
      count: currentRoutes.length,
    },
  );

  // 遷移前のルート群をパス文字列ごとに前回 params へ対応付けます。
  // 同一パターン内の値変化を検出するため、階層ごとに対称的な比較を行います。
  const prevRoutePathSet: ReadonlySet<string> = new Set(prevRoutes?.map((r) => r.path));
  const prevParamsByPath = new Map<string, RouteParams>();
  for (const prevRoute of prevRoutes ?? []) {
    if (!prevParamsByPath.has(prevRoute.path)) {
      prevParamsByPath.set(prevRoute.path, prevRoute.params ?? {});
    }
  }

  // 遷移前の履歴 ID に紐づくローダーデータのキャッシュマップをストアから取得します。
  const prevLoaderDataMap: ReadonlyMap<LoaderFunction, NinjaPromise<unknown>> | undefined =
    loaderDataStore.get(prevEntry.id);
  const currentLoaderDataMap = new Map<LoaderFunction, NinjaPromise<unknown>>();
  const rawPromises: NinjaPromise<unknown>[] = [];
  const request = RouteRequest.new("GET", currentEntry.url, signal);

  // 現在マッチしているすべてのルートセグメントを個別に精査します。
  for (const currentRoute of currentRoutes) {
    const {
      loader: currentLoader,
      params: currentParams = {},
      shouldReload,
    } = currentRoute;
    const prevParams: RouteParams = prevParamsByPath.get(currentRoute.path) ?? {};
    // ローダー関数が定義されていないルートセグメントはスキップします。
    if (typeof currentLoader !== "function") {
      continue;
    }
    // 過去に同じローダー関数が実行され、かつそのキャッシュデータが存在するかをチェックします。
    const prevLoaderData = prevLoaderDataMap?.get(currentLoader);
    if (!prevLoaderData) {
      log.debug("ローダーを新規起動します（path: {path}）", { path: currentRoute.path });
      const raw = NinjaPromise.try(function executeLoader() {
        return currentLoader({
          params: currentParams,
          request,
        });
      });
      rawPromises.push(raw);
      currentLoaderDataMap.set(currentLoader, hideLoaderRedirect(raw));
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
            !prevRoutePathSet.has(currentRoute.path) ||
            // 同一パターン内で当該ルートの params 値が変化した場合も、既定値を true とします。
            // (`/posts/1` → `/posts/2` で `/posts/:postId` の loader を再実行する)
            !areParamsEqual(prevParams, currentParams),
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
        // `shouldReload` は同期的に真偽値を返す必要があります。
        log.debug("shouldReloadが非同期値を返したためエラーにします（path: {path}）", {
          path: currentRoute.path,
        });
        const error = new LoaderConditionError({
          url: request.url.href,
          returnValue: should,
          shouldReload,
        });
        data = NinjaPromise.reject(error);
        break;
      }
      case "rejected": {
        // `shouldReload` の実行中に例外が発生した場合はそのまま引き継ぎます。
        log.debug("shouldReloadの実行中に例外が発生しました（path: {path}）", {
          path: currentRoute.path,
        });
        data = should;
        break;
      }
      case "fulfilled": {
        const { value } = should;
        switch (value) {
          case true: {
            // 明示的にリロードの指示が出た場合のみ、ローダーを新規に再実行します。
            log.debug("ローダーを再実行します（path: {path}）", { path: currentRoute.path });
            const raw = NinjaPromise.try(function executeLoader() {
              return currentLoader({
                params: currentParams,
                request,
              });
            });
            rawPromises.push(raw);
            data = hideLoaderRedirect(raw);
            break;
          }
          case false: {
            // 再読み込みが不要と判定された場合は、前回のキャッシュをそのまま引き継ぎます。
            log.debug("ローダーのキャッシュを再利用します（path: {path}）", {
              path: currentRoute.path,
            });
            data = prevLoaderData;
            break;
          }
          default: {
            // 戻り値が真偽値でない場合は仕様不適合としてエラーを割り当てます。
            log.debug("shouldReloadが真偽値以外を返したためエラーにします（path: {path}）", {
              path: currentRoute.path,
            });
            const error = new LoaderConditionError({
              url: request.url.href,
              returnValue: value,
              shouldReload,
            });
            data = NinjaPromise.reject(error);
          }
        }
        break;
      }
      default: {
        unreachable(should);
      }
    }
    // 確定したプロミスを今回のマップに登録します。
    currentLoaderDataMap.set(currentLoader, data);
  }

  // 今回の実行フェーズで収集したローダーデータが存在する場合はグローバルなキャッシュストアへマージします。
  if (currentLoaderDataMap.size > 0) {
    loaderDataStore.set(
      currentEntry.id,
      new Map([...(loaderDataStore.get(currentEntry.id) || []), ...currentLoaderDataMap]),
    );
  }

  return {
    async idle() {
      // 全ローダーの確定を待ち、隠蔽前の結果からリダイレクトを走査します。
      const results = await Promise.allSettled(rawPromises);
      for (const result of results) {
        if (result.status === "fulfilled" && result.value instanceof RedirectResponse) {
          const redirectTo = result.value;
          log.debug("ローダーがリダイレクトを返しました（to: {to}）", {
            to: `${redirectTo.pathname}${redirectTo.search}${redirectTo.hash}`,
          });
          return { redirectTo };
        }
      }
      return { redirectTo: undefined };
    },
  };
}

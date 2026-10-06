import { NinjaPromise } from "ninja-promise";

import log from "../_logger.js";
import unreachable from "./_unreachable.js";
import type { HistoryEntryUrl } from "./history-entry-url-schema.js";
import type { MatchedRoute } from "./match-routes.js";
import type { ReadonlyFormData } from "./readonly-form-data.types.js";
import RedirectResponse from "./redirect-response.js";
import RouteRequest from "./route-request.js";
import type { ActionFunction, RouteParams } from "./route.types.js";

/**
 * アクション処理の実行開始時に必要となる、起点リクエスト情報の型定義です。
 */
export type ActionStartRequest = {
  /**
   * アクションの送信先である現在の正規化済み URL オブジェクトです。
   */
  readonly url: HistoryEntryUrl;

  /**
   * クライアントから送信された、書き換え用の不変なフォームデータです。
   */
  readonly formData: ReadonlyFormData;

  /**
   * 実行中の非同期アクションを外部から中断するための中断シグナルです。
   */
  readonly signal: AbortSignal;
};

/**
 * 起動されたアクションの実行コンテキストおよび非同期状態を追跡し、制御するためのインターフェースです。
 */
export interface StartedAction {
  /**
   * アクションの実行結果、または現在進行中の非同期状態を表す `NinjaPromise` です。
   */
  data: NinjaPromise<unknown>;

  /**
   * 実際に実行対象として選出されたアクション関数の参照です。
   */
  func: ActionFunction;

  /**
   * アクションの非同期処理が完了してアイドル状態に移行するのを待機し、処理結果に伴うリダイレクト要求の有無を回収します。
   *
   * @returns 処理結果に伴うリダイレクト要求を含むオブジェクトです。
   */
  idle: () => Promise<{
    redirectTo: RedirectResponse | undefined;
  }>;
}

/**
 * マッチしたルート配列から、アクションの送信先に近い親ルートのアクション関数を 1 つだけ選出して実行し、リダイレクトの傍受や応答データの型正規化などを行う、POST 処理の開始関数です。
 *
 * @param routes 現在の URL にマッチしたルート情報の配列です。
 * @param request アクションを起動するための URL、フォームデータ、および中断シグナルを含むオブジェクトです。
 * @returns 実行対象のアクション関数が検出された場合は `StartedAction` オブジェクトを返し、1 つも定義されていなかった場合は `null` を返します。
 */
export default function startAction(
  routes: readonly Pick<MatchedRoute, "params" | "action" | "urlPath">[],
  request: ActionStartRequest,
): StartedAction | null {
  let action: ActionFunction;
  let params: RouteParams;
  let matched = false;
  let matchedUrlPath = "";

  for (const route of routes) {
    if (
      // アクションを実行するために、関数が定義されている必要があります。
      typeof route.action === "function" &&
      // アクションの送信先に近い親ルートを選出します。
      (request.url.pathname === route.urlPath ||
        (route.urlPath !== "/" && request.url.pathname.startsWith(route.urlPath + "/")) ||
        (route.urlPath === "/" && request.url.pathname.startsWith("/")))
    ) {
      action = route.action;
      params = route.params;
      matchedUrlPath = route.urlPath;
      matched = true;
      break;
    }
  }

  if (!matched) {
    log.debug("実行対象のアクションが見つかりません（pathname: {pathname}）", {
      pathname: request.url.pathname,
    });
    return null;
  }

  log.debug("アクションを開始します（urlPath: {urlPath}, pathname: {pathname}）", {
    urlPath: matchedUrlPath,
    pathname: request.url.pathname,
  });

  let actionData: NinjaPromise<unknown> | undefined;
  let redirectTo: RedirectResponse | undefined;

  const actionReturn = NinjaPromise.try(function executeAction() {
    return action({
      params,
      request: RouteRequest.new("POST", request.url, request.signal, request.formData),
    });
  });

  switch (actionReturn.status) {
    case "pending": {
      log.debug("アクションは非同期で実行中です（urlPath: {urlPath}）", {
        urlPath: matchedUrlPath,
      });
      // アクションの戻り値が非同期である場合、中継用のプロミスを作成して状態変化をコントロールします。
      const proxy = NinjaPromise.withResolvers();
      actionData = proxy.promise;

      // 非同期の完了を追跡します。
      void (async () => {
        const value = await actionReturn;
        switch (true) {
          // アクションの非同期結果がリダイレクト応答（RedirectResponse）であった場合、
          // 内部状態にリダイレクト先を記録し、画面側のコンポーネントが参照するデータとしては undefined を返してデータ露出を抑制します。
          case value instanceof RedirectResponse:
            redirectTo = value;
            log.debug("アクションがリダイレクトを返しました（to: {to}）", {
              to: `${value.pathname}${value.search}${value.hash}`,
            });
            return undefined;

          default:
            log.debug("アクションが正常に完了しました（urlPath: {urlPath}）", {
              urlPath: matchedUrlPath,
            });
            return value;
        }
      })()
        .then((value) => proxy.resolve(value))
        .catch((reason) => {
          log.debug("アクションが失敗しました（urlPath: {urlPath}）", {
            urlPath: matchedUrlPath,
          });
          proxy.reject(reason);
        }); // 例外が発生した場合はそのまま下流へ伝播させます。

      break;
    }

    case "rejected":
      // 同期的な実行の段階で既に例外が発生している場合は、特別な加工をせずそのままエラー状態を引き継ぎます。
      // エラーハンドリングの責務は、このアクションデータを参照し、購読するコンポーネント側に一任されます。
      log.debug("アクションが同期的に失敗しました（urlPath: {urlPath}）", {
        urlPath: matchedUrlPath,
      });
      actionData = actionReturn;

      break;

    case "fulfilled": {
      // 同期的に実行が完了し、すでに値が確定している場合の処理です。
      const { value } = actionReturn;
      switch (true) {
        case value instanceof RedirectResponse:
          // 返り値がリダイレクト指示である場合は、リダイレクト先を記録し、データを undefined に置き換えた解決済みのプロミスを作成します。
          log.debug("アクションがリダイレクトを返しました（to: {to}）", {
            to: `${value.pathname}${value.search}${value.hash}`,
          });
          redirectTo = value;
          actionData = NinjaPromise.resolve(undefined);
          break;

        default:
          // 通常のデータであれば、そのままの完了状態をアクションデータとして引き継ぎます。
          log.debug("アクションが同期的に完了しました（urlPath: {urlPath}）", {
            urlPath: matchedUrlPath,
          });
          actionData = actionReturn;
      }

      break;
    }

    default:
      unreachable(actionReturn);
  }

  return {
    data: actionData,
    func: action!,
    async idle() {
      try {
        // アクションデータのエラーハンドリングはコンポーネント側に一任されます。
        await actionData;
      } catch {}

      return {
        redirectTo,
      };
    },
  };
}

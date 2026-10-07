import { RouteContextMissingError } from "@pera1/core";
import { use } from "react";

import log from "../_logger.js";
import RouteContext, { type RouteContextValue } from "../contexts/route-context.js";

/**
 * React のコンポーネントツリーから、現在の階層に紐づくルートの文脈情報を取得するためのカスタムフックです。
 *
 * コンテキストが供給されていない状況を検知した場合はエラーを投げます。
 *
 * @returns 現在の階層で確定している `RouteContextValue` のルートコンテキストデータを返します。
 */
export default function useRouteContext(): RouteContextValue {
  const routeContext = use(RouteContext);
  if (!routeContext) {
    log.debug("RouteContext が見つかりません");

    throw new RouteContextMissingError();
  }

  return routeContext;
}

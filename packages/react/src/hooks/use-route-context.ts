import { RouteContextMissingError } from "@pera1/core";
import * as React from "react";

import RouteContext, { type RouteContextValue } from "../contexts/route-context.js";

/**
 * React のコンポーネントツリーから、現在の階層に紐づいているルートの文脈情報を安全に取得するためのカスタムフックです。
 *
 * コンテキストが供給されていない状況を検知した場合はエラーを投げます。
 *
 * @returns 現在の階層で確定している型 `RouteContextValue` のルートコンテキストデータを返します。
 */
export default function useRouteContext(): RouteContextValue {
  const routeContext = React.use(RouteContext);
  if (!routeContext) {
    throw new RouteContextMissingError();
  }

  return routeContext;
}

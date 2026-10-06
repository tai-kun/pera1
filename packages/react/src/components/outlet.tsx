import { RouteContextMissingError } from "@pera1/core";
import * as React from "react";

import log from "../_logger.js";
import RouteContext from "../contexts/route-context.js";

/**
 * ネストされたルーティング構造において、親ルートのレイアウト内にマッチした子ルートを適切な位置に埋め込んで描画するためのプレースホルダーコンポーネントです。
 *
 * @returns 描画すべき子ルートの React 要素を返します。これ以上下位のルートがない場合は `null` を返します。
 */
export default function Outlet(): React.ReactElement | null {
  const routeContext = React.use(RouteContext);
  if (!routeContext) {
    log.debug("RouteContextが見つかりません");
    throw new RouteContextMissingError();
  }

  return routeContext.outlet;
}

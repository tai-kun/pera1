import { NavigationApiEngine } from "@pera1/core";

import log from "../_logger.js";
import useSingleton from "../hooks/_use-singleton.js";
import Router, { type RouterRouteDefinition } from "./router.jsx";

/**
 * `BrowserRouter` コンポーネントに引き渡すプロパティーの型定義です。
 */
export type BrowserRouterProps = {
  /**
   * アプリケーション全体の画面構造を定義したルート定義の配列です。
   */
  routes: readonly RouterRouteDefinition[];
};

/**
 * ブラウザー環境における SPA ルーティングを開始するための、最上位エントリーポイントコンポーネントです。
 *
 * モダンなブラウザー標準の `Navigation API` に依存しています。
 *
 * @param props アプリケーションに組み込むルート定義の配列です。
 */
export default function BrowserRouter(props: BrowserRouterProps): React.ReactElement {
  const { routes } = props;
  const engine = useSingleton(() => {
    log.debug("NavigationApiEngineを作成します");
    return new NavigationApiEngine();
  });

  return <Router engine={engine} routes={routes} />;
}

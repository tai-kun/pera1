import { NavigationApiEngine } from "@pera1/core";

import log from "../_logger.js";
import useSingleton from "../hooks/_use-singleton.js";
import type { ScrollRestorationOption } from "../hooks/use-scroll-restoration.js";
import Router, { type RouterRouteDefinition } from "./router.jsx";

/**
 * `BrowserRouter` コンポーネントに渡すプロパティーです。
 */
export type BrowserRouterProps = {
  /**
   * アプリケーション全体の画面構造を定義したルート定義の配列です。
   */
  routes: readonly RouterRouteDefinition[];

  /**
   * どのルートにもマッチしなかったときに描画されるフォールバックコンポーネントです (006)。
   *
   * 明示的な `path: "/*"` 定義がある場合は通常のマッチとしてそちらが優先され、本プロパティーは使われません (後方互換のレガシー手段として併存可能です)。
   * どちらもない場合は従来通り `null` を描画し、開発モードでは警告を出します。
   */
  notFoundComponent?: React.ComponentType<{}> | undefined;

  /**
   * 遷移後に先頭へスクロールするかを制御するオプトイン指定です (012)。
   *
   * - 省略・`false`: 何もしません (既定のブラウザー任せ)。
   * - `true`: 先頭へスクロールします (`behavior: "auto"`)。
   * - `ScrollBehavior`: 指定した振る舞いで先頭へスクロールします。
   *
   * ハッシュ付き遷移と初回表示はブラウザーに任せて何もしません。
   */
  scrollRestoration?: ScrollRestorationOption | undefined;
};

/**
 * ブラウザー環境における SPA ルーティングを開始するための、最上位エントリーポイントコンポーネントです。
 *
 * モダンなブラウザー標準の `Navigation API` に依存しています。
 *
 * @param props アプリケーションに組み込むルート定義の配列です。
 */
export default function BrowserRouter(props: BrowserRouterProps): React.ReactElement {
  const { routes, notFoundComponent, scrollRestoration } = props;
  const engine = useSingleton(() => {
    log.debug("NavigationApiEngine を作成します");
    return new NavigationApiEngine();
  });

  return (
    <Router
      engine={engine}
      routes={routes}
      notFoundComponent={notFoundComponent}
      scrollRestoration={scrollRestoration}
    />
  );
}

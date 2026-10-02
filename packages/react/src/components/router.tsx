import type {
  IEngine,
  MatchedRoute,
  RouteDefinitionModule,
  RouteDefinitionObject,
} from "@pera1/core";
import { createRouter } from "@pera1/core";
import * as React from "react";

import RouteContext from "../contexts/route-context.js";
import RouterContext, {
  type RouterContextValue,
  type RouterRef,
} from "../contexts/router-context.js";

/**
 * `ComponentRenderer` コンポーネントに渡されるプロパティーの型定義です。
 */
type ComponentRendererProps = {
  /**
   * レンダリング対象となる、マッチした単一のルート情報です。
   */
  route: MatchedRoute<React.ComponentType<{}>>;

  /**
   * このルートの配下に描画されるべき子コンポーネントの要素です。
   */
  outlet: React.ReactElement<RouteRendererProps, typeof RouteRenderer> | null;
};

/**
 * マッチした個々のルートコンポーネントを、固有の `RouteContext` で包み込みながら再帰的にマウント・展開していくための内部レンダラーコンポーネントです。
 */
function ComponentRenderer(props: ComponentRendererProps): React.JSX.Element | null {
  const parentRoute = React.use(RouteContext);
  const { route, outlet } = props;
  const context = {
    ...route,
    outlet,
    // 親ルートのアクションとローダーを引き継ぐことで、`useActionData` と `useLoaderData` がデータを参照できようにします。
    action: route.action ?? parentRoute?.action,
    loader: route.loader ?? parentRoute?.loader,
  };
  const Comp = route.component;

  return (
    <RouteContext value={context}>{typeof Comp === "function" ? <Comp /> : outlet}</RouteContext>
  );
}

/**
 * `RouteRenderer` コンポーネントに渡されるプロパティーの型定義です。
 */
type RouteRendererProps = {
  /**
   * マッチしたルートの階層配列です。
   */
  routes: readonly MatchedRoute<React.ComponentType<{}>>[];

  /**
   * 現在処理しているルート配列のインデックス（深さ）です。
   */
  index?: number;
};

/**
 * マッチしたルート配列を親から子の順番へと正しく巡回し、各階層を入れ子状の React エレメントツリーへと再帰的にビルドするコンポーネントです。
 */
function RouteRenderer(props: RouteRendererProps): React.ReactElement {
  const { index = 0, routes } = props;
  const route = routes[index]!;

  // 配列の終端に達していない場合はインデックスを 1 進めて自身を再帰的に呼び出し、ネストされる子要素を生成します。
  const outlet =
    index < routes.length - 1 ? <RouteRenderer routes={routes} index={index + 1} /> : null;

  return <ComponentRenderer route={route} outlet={outlet} />;
}

export type RouterRouteDefinitionObject = RouteDefinitionObject<string, React.ComponentType<{}>> & {
  readonly action?: { (args: any): unknown } | undefined;
  readonly shouldReload?: { (args: any): boolean } | undefined;
  readonly loader?: { (args: any): unknown } | undefined;
};

export type RouterRouteDefinitionModule = RouteDefinitionModule<string, React.ComponentType<{}>> & {
  readonly action?: { (args: any): unknown } | undefined;
  readonly shouldReload?: { (args: any): boolean } | undefined;
  readonly loader?: { (args: any): unknown } | undefined;
};

export type RouterRouteDefinition = RouterRouteDefinitionObject | RouterRouteDefinitionModule;

/**
 * `Router` コンポーネントに渡されるルートプロパティーの型定義です。
 */
export type RouterProps = {
  /**
   * プラグイン形式で差し込まれる、ルーティングの実装です。
   */
  engine: IEngine<React.ComponentType<{}>>;

  /**
   * ユーザーがアプリケーションに定義したルート定義の配列です。
   */
  routes: readonly RouterRouteDefinition[];
};

/**
 * 宣言的なルート定義と、命令的なルーティング実行エンジンを仲介・統合し、アプリケーションの最上位でルーティングのライフサイクルと状態管理を司るプロバイダーコンポーネントです。
 *
 * 状態管理の実体は `@pera1/core` の `createRouter` に委譲しており、本コンポーネントは React へのバインディング (購読・描画) のみを担当します。
 * 将来の `@pera1/solid` でも同じコントローラーを再利用できます。
 */
export default function Router(props: RouterProps) {
  const { engine, routes: routesProp } = props;

  // レンダリングを跨いで常に同一参照を維持し、かつ子コンポーネントから不要な再レンダリングなしでメソッドを叩けるように、ルーターコアの外部参照実体を useRef で永続管理します。
  const routerRef = React.useRef({} as RouterRef["current"]);

  // フレームワーク共通のコントローラーを useMemo でインスタンス化します。
  // 実体 (stores / subscribers / engine 連携) は `@pera1/core` 側に集約されています。
  const router = React.useMemo<{
    readonly start: () => () => void;
    readonly context: RouterContextValue;
    readonly getRoutes: () => readonly MatchedRoute<React.ComponentType<{}>>[] | undefined;
  }>(() => {
    const controller = createRouter<React.ComponentType<{}>>({
      engine,
      routes: routesProp,
    });

    // 作成したスナップショットの参照を、永続化 Ref オブジェクトへと安全にマージします。
    Object.assign(routerRef.current, controller.getSnapshot());

    return {
      start: controller.start,
      context: {
        routerRef: routerRef as RouterRef,
        subscribe: controller.subscribe,
      },
      getRoutes: controller.getRoutes,
    };
  }, [engine, routesProp]);

  // コンポーネントのマウント時にルーターエンジンを始動させ、アンマウント時には自動的に破棄タスクを連動させます。
  React.useEffect(() => router.start(), [router]);

  // マッチしたルート階層配列をリアクティブに常時監視します。
  const routes = React.useSyncExternalStore(router.context.subscribe, router.getRoutes);

  // 有効なルートマッチングがない場合は何も描画しません。
  if (!routes) {
    // TODO(tai-kun): 404 Not Found ページを表示できるようにします。
    return null;
  }

  return (
    <RouterContext value={router.context}>
      {/* マッチルート配列は詳細度の高い「子 -> 親」の順で並んでいるため、React のネストレイアウト構造（親の中に子を入れる）に適合させるために `.toReversed()` で「親 -> 子」の順に反転させてからレンダラーへ投入します。*/}
      <RouteRenderer routes={routes.toReversed()} />
    </RouterContext>
  );
}

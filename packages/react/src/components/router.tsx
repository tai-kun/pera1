/// <reference types="node" />
import type {
  IEngine,
  MatchedRoute,
  RouterSnapshot,
  RouteDefinitionModule,
  RouteDefinitionObject,
} from "@pera1/core";
import { createRouter } from "@pera1/core";
import * as React from "react";

import log from "../_logger.js";
import RouteContext from "../contexts/route-context.js";
import RouterContext, {
  type RouterRef,
  type RouterContextValue,
} from "../contexts/router-context.js";
import useScrollRestoration, {
  type ScrollRestorationOption,
} from "../hooks/use-scroll-restoration.js";

/**
 * `ComponentRenderer` コンポーネントに渡すプロパティーです。
 */
type ComponentRendererProps = {
  /**
   * レンダリング対象となる、マッチした単一のルート情報です。
   */
  readonly route: MatchedRoute<React.ComponentType<{}>>;

  /**
   * このルートの配下に描画されるべき子コンポーネントの要素です。
   */
  readonly outlet: React.ReactElement<RouteRendererProps, typeof RouteRenderer> | null;
};

/**
 * マッチした個々のルートコンポーネントを、固有の `RouteContext` で包み込みながら再帰的にマウントし、展開していくための内部レンダラーコンポーネントです。
 */
function ComponentRenderer(props: ComponentRendererProps): React.JSX.Element | null {
  const parentRoute = React.use(RouteContext);
  const { route, outlet } = props;
  const context = {
    ...route,
    outlet,
    // 親ルートのアクションとローダーを引き継ぐことで、`useActionData` と `useLoaderData` がデータを参照できるようにします。
    action: route.action ?? parentRoute?.action,
    loader: route.loader ?? parentRoute?.loader,
  };
  const Comp = route.component;

  return (
    <RouteContext value={context}>{typeof Comp === "function" ? <Comp /> : outlet}</RouteContext>
  );
}

/**
 * `RouteRenderer` コンポーネントに渡すプロパティーです。
 */
type RouteRendererProps = {
  /**
   * マッチしたルートの階層配列です。
   */
  readonly routes: readonly MatchedRoute<React.ComponentType<{}>>[];

  /**
   * 現在処理しているルート配列のインデックス（深さ）です。
   */
  readonly index?: number;
};

/**
 * マッチしたルート配列を親から子の順番に巡回し、各階層を入れ子状の React エレメントツリーに再帰的に構築するコンポーネントです。
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
 * `Router` コンポーネントに渡すプロパティーです。
 */
export type RouterProps = {
  /**
   * プラグイン形式で差し込まれる、ルーティングの実装です。
   */
  readonly engine: IEngine<React.ComponentType<{}>>;

  /**
   * ユーザーがアプリケーションに定義したルート定義の配列です。
   */
  readonly routes: readonly RouterRouteDefinition[];

  /**
   * どのルートにもマッチしなかったときに描画されるフォールバックコンポーネントです (006)。
   *
   * 明示的な `path: "/*"` 定義がある場合は通常のマッチとしてそちらが優先され、本プロパティーは使われません (後方互換のレガシー手段として併存可能です)。
   * どちらもない場合は従来通り `null` を描画し、開発モードでは警告を出します。
   */
  readonly notFoundComponent?: React.ComponentType<{}> | undefined;

  /**
   * 遷移後に先頭へスクロールするかを制御するオプトイン指定です (012)。
   *
   * - 省略・`false`: 何もしません (既定のブラウザー任せ)。
   * - `true`: 先頭へスクロールします (`behavior: "auto"`)。
   * - `ScrollBehavior`: 指定した振る舞いで先頭へスクロールします。
   *
   * ハッシュ付き遷移と初回表示はブラウザーに任せて何もしません。
   * 戻る・進むでの位置復元までは行いません。
   */
  readonly scrollRestoration?: ScrollRestorationOption | undefined;
};

/**
 * 未マッチかつフォールバック未定義のときに開発モードでのみ警告します。
 */
function warnMissingNotFound(): void {
  if (typeof process !== "undefined" && process.env?.["NODE_ENV"] === "production") {
    return;
  }

  log.warn(
    "一致するルートがなく notFoundComponent も未定義です。404 画面を表示するには Router に notFoundComponent を渡してください。",
  );
}

/**
 * `scrollRestoration` プロパティーを `RouterContext` 配下で有効化するための内部コンポーネントです。
 *
 * フックが `RouterContext` を必要とするため、`Router` 自身ではなく配下の子として呼びます。
 */
function ScrollRestorationHandler(props: {
  readonly scrollRestoration: ScrollRestorationOption | undefined;
}): null {
  useScrollRestoration(props.scrollRestoration);

  return null;
}

/**
 * 宣言的なルート定義と命令的なルーティング実行エンジンを仲介し、統合し、アプリケーションの最上位でルーティングのライフサイクルと状態管理を司るプロバイダーコンポーネントです。
 *
 * 状態管理の実体は `@pera1/core` の `createRouter` に委譲しており、本コンポーネントは React へのバインディングのみを担当します。
 * 将来の `@pera1/solid` でも同じコントローラーを再利用できます。
 */
export default function Router(props: RouterProps) {
  const { engine, routes: routesProp, notFoundComponent: NotFound, scrollRestoration } = props;

  // レンダリングをまたいで常に同一参照を維持し、子コンポーネントの不要な再レンダリングを防ぐためにメソッドを呼び出せるように、ルーターコアの外部参照実体を `useRef` で永続的に管理します。
  const routerRef = React.useRef({} as RouterRef["current"]);

  // フレームワーク共通のコントローラーを useMemo でインスタンス化します。
  // 実体（stores / subscribers / engine 連携）は `@pera1/core` 側に集約されています。
  const router = React.useMemo<{
    readonly start: () => () => void;
    readonly context: RouterContextValue;
    readonly getRoutes: () => readonly MatchedRoute<React.ComponentType<{}>>[] | undefined;
    readonly getSnapshot: () => RouterSnapshot;
  }>(() => {
    log.debug("Router コントローラーを作成します（定義数: {count}）", {
      count: routesProp.length,
    });
    const controller = createRouter<React.ComponentType<{}>>({
      engine,
      routes: routesProp,
    });

    return {
      start: controller.start,
      context: {
        routerRef: routerRef as RouterRef,
        subscribe: controller.subscribe,
      },
      getRoutes: controller.getRoutes,
      getSnapshot: controller.getSnapshot,
    };
  }, [engine, routesProp]);

  // `getSnapshot()` の返すオブジェクトは同一参照ですが、内部の `currentEntry` は遷移のたびにコントローラー側で差し替えられます。
  // 一度だけ写し取ると `useLoaderData` などが古いエントリーを参照し続けてしまうため、レンダリングのたびに最新のスナップショットへ載せ替えます。
  // 同一参照の代入であり冪等なので、並行レンダリングでも安全です。
  routerRef.current = router.getSnapshot();

  // コンポーネントをマウントしたときにルーターエンジンを始動させ、アンマウントするときには自動的に破棄処理と連動させます。
  React.useEffect(() => {
    log.debug("エンジンの監視を開始します");
    const stop = router.start();

    return () => {
      log.debug("エンジンの監視を停止します");
      stop();
    };
  }, [router]);

  // マッチしたルート階層配列をリアクティブに監視します。
  const routes = React.useSyncExternalStore(router.context.subscribe, router.getRoutes);

  // 有効なルートマッチングがない場合は 404 フォールバックを描画します。
  // 明示的な `/*` 定義は通常のマッチとして上記 `routes` に含まれるため、ここに来るのは真の未マッチ (engine の `update(null)` / `init() === null`) のみです。
  if (!routes) {
    if (NotFound) {
      log.debug("一致するルートがないため notFoundComponent を描画します");

      return (
        <RouterContext value={router.context}>
          <ScrollRestorationHandler scrollRestoration={scrollRestoration} />
          <NotFound />
        </RouterContext>
      );
    }

    warnMissingNotFound();
    log.debug("一致するルートがないため null を描画します");

    return null;
  }

  log.debug("マッチしたルートを描画します（paths: {paths}）", () => ({
    paths: routes.map((r) => r.urlPath).join(" <- "),
  }));

  return (
    <RouterContext value={router.context}>
      <ScrollRestorationHandler scrollRestoration={scrollRestoration} />
      {/* マッチしたルート配列は詳細度の高い「子 -> 親」の順で並んでいるため、React のネストレイアウト構造に適合させるために `.toReversed()` で「親 -> 子」の順に反転させてからレンダラーへ渡します。*/}
      <RouteRenderer routes={routes.toReversed()} />
    </RouterContext>
  );
}

import type { RouteParams as $RouteParams } from "./_regexparam.js";
import type { ReadonlyURL } from "./readonly-url.types.js";
import type RoutePatternUtils from "./route-pattern-utils.js";
import type { RouteGetRequest, RoutePostRequest } from "./route-request.js";

/**
 * 文字列リテラルとして定義されたパスの形状から、含まれるパスパラメーターを解析し、静的に型付けされたオブジェクトとして抽出する型定義です。
 *
 * @template TRoutePattern パラメーター抽出の対象となるパス文字列リテラル型です。
 */
export type RouteParams<TRoutePattern extends string = string> = Readonly<
  $RouteParams<TRoutePattern>
>;

/**
 * データ更新などのアクション処理を実行する際に、該当する関数へ渡される引数の型定義です。
 *
 * 解析済みのパスパラメーターと、HTTP の POST メソッドを抽象化したリクエストオブジェクトを含みます。
 *
 * @template TRoutePattern 対象となるルートのパス文字列リテラル型です。
 */
export type ActionFunctionArgs<TRoutePattern extends string = string> = {
  /**
   * 現在の URL パスから抽出されたパラメーターオブジェクトです。
   */
  params: RouteParams<TRoutePattern>;

  /**
   * フォームデータなどを内包する、HTTP の POST メソッドに特化したルーティングリクエストオブジェクトです。
   */
  request: RoutePostRequest;
};

/**
 * データの登録、更新、削除といった副作用を伴うアクション処理を定義するための関数インターフェースです。
 *
 * @template TRoutePattern 対象となるルートのパス文字列リテラル型です。
 * @template TData アクション関数が返す戻り値の型定義です。既定値は `unknown` です。
 */
export interface ActionFunction<TRoutePattern extends string = string, TData = unknown> {
  (args: ActionFunctionArgs<TRoutePattern>): TData;
}

/**
 * ページ遷移やデータ更新が発生した際、現在の画面データを再読み込みすべきかどうかを判定する関数へ渡される引数の型定義です。
 *
 * アクションを実行した契機となる HTTP メソッドの種類（GET / POST）に応じて、含まれるコンテキスト情報が分岐します。
 *
 * @template TRoutePattern 対象となるルートのパス文字列リテラル型です。
 */
export type ShouldReloadFunctionArgs<TRoutePattern extends string = string> =
  | {
      /**
       * 再読み込みを引き起こした HTTP メソッドの種別です。
       */
      triggerMethod: "GET";

      /**
       * 現在の画面に対応する読み取り専用 URL オブジェクトです。
       */
      currentUrl: ReadonlyURL;

      /**
       * 現在の URL から抽出されたパスパラメーターです。
       */
      currentParams: RouteParams<TRoutePattern>;

      /**
       * POST リクエストが発生する直前の読み取り専用 URL オブジェクトです。
       */
      prevUrl: ReadonlyURL;

      /**
       * POST リクエストが発生する直前の URL から抽出されたパスパラメーターです。
       */
      prevParams: RouteParams;

      /**
       * システムが内部ロジックに基づいて判断した、再読み込み実行の既定の判定フラグです。
       */
      defaultShouldReload: boolean;
    }
  | {
      /**
       * 再読み込みを引き起こした HTTP メソッドの種別です。
       */
      triggerMethod: "POST";

      /**
       * 現在の画面に対応する読み取り専用 URL オブジェクトです。
       */
      currentUrl: ReadonlyURL;

      /**
       * 現在の URL から抽出されたパスパラメーターです。
       */
      currentParams: RouteParams<TRoutePattern>;

      /**
       * POST リクエストが発生する直前の読み取り専用 URL オブジェクトです。
       */
      prevUrl: ReadonlyURL;

      /**
       * POST リクエストが発生する直前の URL から抽出されたパスパラメーターです。
       */
      prevParams: RouteParams;

      /**
       * POST リクエストと共に送信された標準のフォームデータオブジェクトです。
       */
      formData: FormData;

      /**
       * 直前に実行されたアクション関数から返されたデータです。
       */
      actionData: unknown;

      /**
       * システムが内部ロジックに基づいて判断した、再読み込み実行の既定の判定フラグです。
       */
      defaultShouldReload: boolean;
    };

/**
 * ルートデータの再読み込みが不必要な場合に、余分な通信や再取得処理を抑制するための判定関数インターフェースです。
 *
 * @template TRoutePattern 対象となるルートのパス文字列リテラル型です。
 * @returns データを再読み込みする場合は `true`、スキップする場合は `false` を返します。
 */
export interface ShouldReloadFunction<TRoutePattern extends string = string> {
  (args: ShouldReloadFunctionArgs<TRoutePattern>): boolean;
}

/**
 * 画面の描画に必要なデータを取得する際に、該当する関数へ渡される引数の型定義です。
 *
 * 解析済みのパスパラメーターと、HTTP の GET メソッドを抽象化したリクエストオブジェクトを含みます。
 *
 * @template TRoutePattern 対象となるルートのパス文字列リテラル型です。
 */
export type LoaderFunctionArgs<TRoutePattern extends string = string> = {
  /**
   * 現在の URL パスから抽出されたパラメーターオブジェクトです。
   */
  params: RouteParams<TRoutePattern>;

  /**
   * HTTP の GET メソッドに特化したルーティングリクエストオブジェクトです。
   */
  request: RouteGetRequest;
};

/**
 * 画面の初期描画時や遷移時にデータをオンデマンドで取得するための関数インターフェースです。
 *
 * @template TRoutePattern 対象となるルートのパス文字列リテラル型です。
 * @template TData ローダー関数が返す戻り値の型定義です。既定値は `unknown` です。
 */
export interface LoaderFunction<TRoutePattern extends string = string, TData = unknown> {
  (args: LoaderFunctionArgs<TRoutePattern>): TData;
}

/**
 * アプリケーションのルーティング設定を定義するためのオブジェクトの型定義です。
 *
 * 開発者が宣言的にルーティングのツリーやリストを記述する際に使用します。
 *
 * @template TPath ルートに関連付けるパス文字列リテラル型です。
 * @template TComponent ルートに対応して描画されるコンポーネントの型です。React なら `React.ComponentType`、Solid.js なら Solid のコンポーネント型などを指定します。
 */
export type RouteDefinitionObject<TPath extends string = string, TComponent = any> = {
  /**
   * マッチングの対象となる URL パスのパターン文字列です。
   */
  readonly path: TPath;

  /**
   * 親ルートのパスにおいて、インデックスルートとして機能させるかどうかのフラグです。
   */
  readonly index?: boolean | undefined;

  /**
   * このルートで実行されるデータ更新用のアクション関数です。
   */
  readonly action?: ActionFunction<TPath> | undefined;

  /**
   * このルートのデータ再読み込み動作を制御する判定関数です。
   */
  readonly shouldReload?: ShouldReloadFunction<TPath> | undefined;

  /**
   * このルートの画面描画に必要なデータを取得する関数です。
   */
  readonly loader?: LoaderFunction<TPath> | undefined;

  /**
   * このルートに対応して描画されるコンポーネントです。
   *
   * フレームワークに依存しないため、具体的な型は `TComponent` ジェネリクスで受け取ります。
   */
  readonly component?: TComponent | undefined;
};
/**
 * ルーティング設定をインポート経由で定義するための構造体型定義です。
 *
 * @template TPath ルートに関連付けるパス文字列リテラル型です。
 * @template TComponent 描画対象となるコンポーネントの型です。
 */
export type RouteDefinitionModule<TPath extends string = string, TComponent = any> = {
  /**
   * マッチングの対象となる URL パスのパターン文字列です。
   */
  readonly path: TPath;

  /**
   * 親ルートのパスにおいて、インデックスルートとして機能させるかどうかのフラグです。
   */
  readonly index?: boolean | undefined;

  /**
   * このルートで実行されるデータ更新用のアクション関数です。
   */
  readonly action?: ActionFunction<TPath> | undefined;

  /**
   * このルートのデータ再読み込み動作を制御する判定関数です。
   */
  readonly shouldReload?: ShouldReloadFunction<TPath> | undefined;

  /**
   * このルートの画面描画に必要なデータを取得する関数です。
   */
  readonly loader?: LoaderFunction<TPath> | undefined;

  /**
   * このルートに対応して描画されるコンポーネントです。
   *
   * `default` プロパティーよりこちらが優先されます。
   */
  readonly component?: TComponent | undefined;

  /**
   * ES モジュールのデフォルトエクスポートとして定義された、描画対象となるコンポーネントです。
   *
   * `component` プロパティーがない場合はこちらにフォールバックされます。
   */
  readonly default?: TComponent | undefined;

  /**
   * オブジェクトの文字列表現をカスタマイズするための組み込みタグプロパティーです。
   *
   * モジュールオブジェクトとしての識別に使用します。
   */
  get [Symbol.toStringTag](): string;
};

/**
 * アプリケーションのルーティング設定を定義するためのオブジェクトの型定義です。
 *
 * @template TPath ルートに関連付けるパス文字列リテラル型です。
 * @template TComponent 描画対象となるコンポーネントの型です。
 */
export type RouteDefinition<TPath extends string = string, TComponent = any> =
  | RouteDefinitionObject<TPath, TComponent>
  | RouteDefinitionModule<TPath, TComponent>;

/**
 * `RouteDefinition` を基にシステム内部で解析、コンパイルされ、ルーティングエンジンが直接処理を行うための実体化されたルートオブジェクトの型定義です。
 *
 * 省略可能だったプロパティーが正規化され、正規表現によるマッチング機構が追加されています。
 *
 * @template TComponent 表示対象となるコンポーネントの型です。
 */
export type Route<TComponent = any> = {
  /**
   * マッチングの対象となる URL パスのパターン文字列です。
   */
  readonly path: string;

  /**
   * インデックスルートであるかどうかの確定的なフラグです。
   */
  readonly index: boolean;

  /**
   * ルートパターンの解析などを行うユーティリティーです。
   */
  readonly utils: RoutePatternUtils;

  /**
   * データ更新用のアクション関数です。未定義の場合は `undefined` となります。
   */
  readonly action: ActionFunction | undefined;

  /**
   * データの再読み込み動作を制御する確定的な判定関数です。定義がない場合はシステム既定の挙動を行う関数が割り当てられます。
   */
  readonly shouldReload: ShouldReloadFunction;

  /**
   * 画面描画に必要なデータを取得する関数です。未定義の場合は `undefined` となります。
   */
  readonly loader: LoaderFunction | undefined;

  /**
   * 表示対象となるコンポーネントです。未定義の場合は `undefined` となります。
   */
  readonly component: TComponent | undefined;
};

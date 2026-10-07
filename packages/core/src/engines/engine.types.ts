import type { NinjaPromise } from "ninja-promise";

import type { HistoryEntry } from "../core/expect-history-entry.js";
import type { HistoryEntryId } from "../core/history-entry-id-schema.js";
import type { MatchedRoute } from "../core/match-routes.js";
import type { ReadonlyFormData } from "../core/readonly-form-data.types.js";
import type { ReadonlyURLSearchParams } from "../core/readonly-url.types.js";
import type RoutePath from "../core/route-path.js";
import type { Route, ActionFunction, LoaderFunction } from "../core/route.types.js";

/**
 * ルーターが管理する現在の画面の状態です。
 *
 * @template TComponent 描画対象となるコンポーネントです。
 */
export type RouterState<TComponent = any> = {
  /**
   * 現在のアクティブな履歴エントリーです。
   */
  readonly entry: HistoryEntry;

  /**
   * 現在の URL にマッチしている子から親までの階層的なルートの配列です。
   */
  readonly routes: readonly [MatchedRoute<TComponent>, ...MatchedRoute<TComponent>[]];
};

/**
 * 実行中のルーティングエンジンを安全に停止させ、各種イベントリスナーや非同期処理をクリーンアップするための関数です。
 */
export interface IStopEngine {
  (): void;
}

/**
 * ルーティングエンジンに関わる各種引数や戻り値の型をまとめた名前空間です。
 */
export namespace IEngine {
  /**
   * ルーター初期化メソッド `init` に渡される引数です。
   */
  export type InitArgs<TComponent = any> = {
    /**
     * アプリケーションに登録されているすべての正規化済みルートの定義配列です。
     */
    routes: readonly Route<TComponent>[];

    /**
     * 各履歴エントリーに紐づくローダーの非同期状態を多重管理する共有データストアへの参照です。
     */
    loaderDataStore: Map<HistoryEntryId, Map<LoaderFunction, NinjaPromise<unknown>>>;

    /**
     * 中断シグナルを取得します。
     */
    getSignal: () => AbortSignal;
  };

  /**
   * ルーター初期化メソッド `init` が返す初期状態です。
   *
   * マッチするルートがあればその状態を返し、なければ `null` となります。
   */
  export type InitReturn<TComponent = any> = RouterState<TComponent> | null;

  /**
   * エンジンの稼働開始メソッド `start` に渡される引数です。
   *
   * ナビゲーションイベントの監視や状態同期に必要な依存関係を集約します。
   */
  export type StartArgs<TComponent = any> = {
    /**
     * アプリケーションに登録されているすべての正規化済みルートの定義配列です。
     */
    routes: readonly Route<TComponent>[];

    /**
     * 各履歴エントリーに紐づくアクションの非同期状態を保持する共有データストアです。
     */
    actionDataStore: Map<HistoryEntryId, Map<ActionFunction, NinjaPromise<unknown>>>;

    /**
     * 各履歴エントリーに紐づくローダーの非同期状態を保持する共有データストアです。
     */
    loaderDataStore: Map<HistoryEntryId, Map<LoaderFunction, NinjaPromise<unknown>>>;

    /**
     * エンジン内部で遷移が確定した際、新しい状態を UI 層に通知して画面の再描画を要求するための更新関数です。
     *
     * 3 値の呼び分けはオーバーロードで型安全に区別されます (006)。
     *
     * - 引数なし: 現在の状態を維持したままの強制再レンダリング (例: アクション開始時のローディング反映)。
     * - `RouterState`: マッチありの確定状態への更新。
     * - `null` の場合は未マッチ (404 相当) へのリセットです。
     *   購読者側は `getRoutes() === undefined` で検出できます。
     */
    update: {
      /**
       * 現在の状態を維持したまま強制的に再レンダリングします。
       */
      (): void;

      /**
       * ルーターの状態を更新します。
       *
       * @param newRouterState 新しいルーターの状態です。
       * `null` は未マッチ (404 相当) へのリセットを意味します。
       */
      (newRouterState: RouterState<TComponent> | null): void;
    };

    /**
     * 中断シグナルを取得します。
     */
    getSignal: () => AbortSignal;
  };

  /**
   * エンジンの稼働開始メソッド `start` の戻り値です。
   *
   * 監視イベントのリスナーを解除するためのクリーンアップ関数を返すか、環境によって何も返さない場合があります。
   */
  export type StartReturn = IStopEngine | void;

  /**
   * プログラムからのフォーム送信やクエリー更新を行う `submit` メソッドの引数です。
   */
  export type SubmitArgs =
    | {
        /**
         * HTTP POST メソッドに相当する、マルチパートまたは URL エンコードされたフォームデータの送信です。
         */
        readonly type: "FORM_DATA";

        /**
         * 送信する不変のフォームデータ本体です。
         */
        readonly target: ReadonlyFormData;

        /**
         * アクションの送信先となる対象の URL パス文字列です。
         */
        readonly action: string;
      }
    | {
        /**
         * HTTP GET メソッドに相当する、URL の検索クエリーの更新送信です。
         */
        readonly type: "URL_SEARCH_PARAMS";

        /**
         * 更新対象となる検索クエリーパラメーターです。
         */
        readonly target: ReadonlyURLSearchParams;

        /**
         * クエリーの付与先となる対象の URL パス文字列です。
         */
        readonly action: string;

        /**
         * 履歴スタックへの追加方法を指定します。
         *
         * - `"push"`: 履歴エントリーの新規追加です。
         * - `"replace"`: 履歴エントリーの上書きです。
         */
        readonly history: "replace" | "push";
      };

  /**
   * 命令的な画面遷移を行う `navigate` メソッドの引数です。
   *
   * リンクをクリックした際のアドレス遷移か、ブラウザーの「戻る、進む」に相当する相対移動かで分岐します。
   */
  export type NavigateArgs =
    | {
        /**
         * 明示的なアドレス指定による前方移動です。
         */
        readonly type: "LINK";

        /**
         * 遷移先のアドレス表現の指定です。
         * 完全なパス文字列か、部分的なパーツの組み合わせかを選択します。
         */
        readonly to:
          | {
              /**
               * URL パスで前方移動する形式です。
               */
              readonly type: "STATIC";

              /**
               * URL パスです。
               */
              readonly path: string;
            }
          | {
              /**
               * URL の各コンポーネントを関数形式で個別に指定する形式です。
               */
              readonly type: "DYNAMIC";

              /**
               * 動的にパッチを適用する関数です。
               *
               * @param path アプリケーション内のルーティングにおけるパスを安全に構築し、解析し、操作するためのオブジェクトです。
               */
              readonly patch: (path: RoutePath) => void;
            };

        /**
         * 履歴スタックへの追加方法を指定します。
         *
         * - `"push"`: 履歴エントリーの新規追加です。
         * - `"replace"`: 履歴エントリーの上書きです。
         */
        readonly history: "replace" | "push";
      }
    | {
        /**
         * 履歴スタック内の相対的な位置移動（例: `-1` で 1 つ戻る、`2` で 2 つ進む）です。
         */
        readonly type: "MOVE";

        /**
         * 履歴を移動させる差分ステップ数です。
         */
        readonly delta: number;
      };
}

/**
 * ルーティングエンジンです。
 *
 * @template TComponent 描画対象となるコンポーネントです。
 */
export interface IEngine<TComponent = any> {
  /**
   * 現在の URL を基にルーターの初期状態を計算し、同期的に取得します。
   */
  init(args: IEngine.InitArgs<TComponent>): IEngine.InitReturn<TComponent>;

  /**
   * エンジンを稼働させ、ブラウザーの履歴変更やナビゲーションイベントの継続的な監視を開始します。
   */
  start(args: IEngine.StartArgs<TComponent>): IEngine.StartReturn;

  /**
   * ユーザーからの意図的なフォームデータまたはクエリーパラメーターの送信を検知し、対応するルートのアクションやローダーを起動します。
   */
  submit(args: IEngine.SubmitArgs): void;

  /**
   * プログラムからの命令的なページ遷移を処理します。
   */
  navigate(args: IEngine.NavigateArgs): void;
}

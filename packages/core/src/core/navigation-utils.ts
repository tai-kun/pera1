import type { IEngine } from "../engines/engine.types.js";
import type RoutePath from "./route-path.js";

/**
 * 遷移先のアドレスを指定するための表現型です。
 *
 * 完全な URL パス文字列か、またはパスの各コンポーネントを部分的にパッチするためのオブジェクトのいずれかを受け入れます。
 * React の `useNavigate` でも Solid.js でも同じ入力形状を使えるよう、core に切り出した共通型です。
 */
export type NavigateTo =
  | string
  | {
      /**
       * 遷移先のドメイン以下のリクエストパス（例: `"/dashboard"`）です。
       */
      readonly pathname?: string | undefined;

      /**
       * 遷移先に付与する検索クエリー文字列（例: `"?id=foo"`）です。
       */
      readonly search?: string | undefined;

      /**
       * 遷移先に付与するハッシュフラグメント（例: `"#profile"`）です。
       */
      readonly hash?: string | undefined;
    }
  | {
      /**
       * 動的にパッチを適用します。
       *
       * @param path アプリケーション内のルーティングにおけるパスを安全に構築し、解析し、操作するためのオブジェクトです。
       */
      (route: RoutePath): void;
    };

/**
 * 画面遷移の挙動をカスタマイズするためのオプション型です。
 */
export type NavigateOptions = {
  /**
   * 履歴スタックへの追加方法を制御します。`true` の場合は現在の履歴を上書きし、`false` または省略時は新規追加します。
   */
  readonly replace?: boolean | undefined;
};

/**
 * `useNavigate` や将来の Solid.js 版が受け取る引数を、低レイヤーの `IEngine.NavigateArgs` に変換します。
 *
 * フレームワーク固有のフック内での分岐ロジックを core に集約することで、React / Solid.js 間の振る舞いの乖離を防ぎます。
 *
 * @param to 遷移先の対象となるデータ表現です。
 * @param options 履歴のスタック方法などを制御するオプションです。
 * @returns エンジンに引き渡すための正規化済み引数です。
 */
export function toNavigateArgs(
  to: NavigateTo | number,
  options?: NavigateOptions,
): IEngine.NavigateArgs {
  if (typeof to === "number") {
    return {
      type: "MOVE",
      delta: to,
    };
  }

  const { replace = false } = options ?? {};
  const history = replace ? "replace" : "push";
  if (typeof to === "string") {
    return {
      to: {
        path: to,
        type: "STATIC",
      },
      type: "LINK",
      history,
    };
  }
  if (typeof to === "object") {
    return {
      to: {
        type: "DYNAMIC",
        patch(path) {
          if (typeof to.pathname === "string") {
            path.pathname = to.pathname;
          }
          if (typeof to.search === "string") {
            path.search = to.search;
          }
          if (typeof to.hash === "string") {
            path.hash = to.hash;
          }
        },
      },
      type: "LINK",
      history,
    };
  }
  return {
    to: {
      type: "DYNAMIC",
      patch(path) {
        (to as (route: RoutePath) => void)(path);
      },
    },
    type: "LINK",
    history,
  };
}

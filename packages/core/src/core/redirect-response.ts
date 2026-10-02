import RoutePath from "./route-path.js";

/**
 * 他のクラスやオブジェクトとの混同を避けるための、このクラス固有の一意の識別シンボル（名目的型付け用）です。
 */
declare const REDIRECT_RESPONSE_SYMBOL: unique symbol;

/**
 * アプリケーション内におけるリダイレクト（画面遷移）の応答を表す不変のデータ構造クラスです。
 *
 * アクションやローダーの処理過程で遷移要求が発生した際、その移動先となるリダイレクトパスの各コンポーネント（パス名、クエリー、ハッシュフラグメント）を解析・保持します。
 */
export default class RedirectResponse {
  /**
   * クラスの型としてのユニーク性を TypeScript 上で強制するためのダミーの読み取り専用プロパティーです。
   *
   * 構造が部分的に一致するだけの他のオブジェクトによる誤入力を防ぎます。
   */
  public readonly [REDIRECT_RESPONSE_SYMBOL]!: never;

  /**
   * 遷移先 URL のハッシュフラグメントです。
   */
  public readonly hash: string;

  /**
   * 遷移先 URL のクエリー文字列です。
   */
  public readonly search: string;

  /**
   * 遷移先 URL のドメイン部分を除いたパスです。
   */
  public readonly pathname: string;

  /**
   * 指定された遷移先パス文字列を解析し、`RedirectResponse` クラスの新しいインスタンスを初期化します。
   *
   * @param destination リダイレクト先となる対象のパスです。
   */
  public constructor(destination: string) {
    const { hash, search, pathname } = new RoutePath(destination);
    this.hash = hash;
    this.search = search;
    this.pathname = pathname;
  }
}

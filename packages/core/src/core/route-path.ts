import type { ReadonlyURL, ReadonlyURLSearchParams } from "./readonly-url.types.js";

/**
 * 連続する複数のスラッシュを検出するための正規表現です。
 */
const MULTI_SLASH = /\/\/+/gu;

/**
 * アプリケーション内のルーティングにおけるパスを安全に構築・解析・操作するためのクラスです。
 *
 * 内包するホストやプロトコルといった余分な情報を排除し、パス、クエリー、ハッシュのみを一貫した規則で管理します。
 */
export interface ReadonlyRoutePath {
  /**
   * 正規化されたパス部分の文字列です。
   */
  readonly pathname: string;

  /**
   * 先頭に `?` を含むクエリー文字列です。
   *
   * 常にソートされます。
   */
  readonly search: string;

  /**
   * 内部の `URL` インスタンスが保持する、クエリーパラメーターを操作するための `URLSearchParams` オブジェクトを取得します。
   */
  readonly searchParams: ReadonlyURLSearchParams;

  /**
   * 先頭に `#` を含むハッシュ文字列を取得します。
   */
  readonly hash: string;

  /**
   * 現在保持しているすべてのコンポーネントを結合し、ルーティング用のパス文字列として出力します。
   *
   * @returns ソート済みのクエリーおよびハッシュを含んだ、正規化されたパス全体の文字列を返します。
   */
  toString(): string;

  /**
   * このインスタンスを複製し、上書き可能な形式で取得します。
   *
   * @returns 上書き可能な {@link RoutePath|`RoutePath`} インスタンスです。
   */
  clone(): RoutePath;
}

/**
 * アプリケーション内のルーティングにおけるパスを安全に構築・解析・操作するためのクラスです。
 *
 * 内包するホストやプロトコルといった余分な情報を排除し、パス、クエリー、ハッシュのみを一貫した規則で管理します。
 */
export default class RoutePath implements ReadonlyRoutePath {
  /**
   * 与えられた文字列または URL オブジェクトから、正規化されたパス文字列を即座に生成する静的メソッドです。
   *
   * @param path 正規化の対象となるパス文字列、または `ReadonlyURL` の一部分を構成するオブジェクトです。
   * @returns 冗長なスラッシュや末尾のスラッシュが取り除かれた、結合済みのパス文字列を返します。
   */
  public static encode(path: string | Pick<ReadonlyURL, "pathname" | "search" | "hash">): string {
    return new RoutePath(path).toString();
  }

  /**
   * 内部でパスコンポーネントの解析と検証を委譲するために保持する、組み込みの `URL` インスタンスです。
   *
   * 基底となる仮想的なオリジンと結合して管理されます。
   */
  readonly #url: URL;

  /**
   * 新しい `RoutePath` インスタンスを初期化します。
   *
   * 引数として渡された入力値を解析し、スラッシュの重複排除および末尾のスラッシュ削除を自動的に行います。
   *
   * @param path 初期化に使用するパス文字列、または `ReadonlyURL` の一部のプロパティーを持つオブジェクトです。既定値は空文字列です。
   */
  public constructor(path: string | Pick<ReadonlyURL, "pathname" | "search" | "hash"> = "") {
    if (typeof path === "string") {
      path = ("/" + path).replace(MULTI_SLASH, "/");
    } else {
      const { hash, search, pathname } = path;
      path = ("/" + pathname).replace(MULTI_SLASH, "/") + search + hash;
    }

    // 組み込みの URL クラスによる厳密な解析機能を利用するため、仮想のプロトコルとホストを前置きして初期化します。
    this.#url = new URL("x://y" + path);

    // ルートパス（/）単体である場合を除き、末尾に存在する不要なスラッシュを削除して一貫性を保ちます。
    const { pathname } = this.#url;
    if (pathname !== "/" && pathname.endsWith("/")) {
      this.#url.pathname = pathname.substring(0, pathname.length - 1);
    }
  }

  /**
   * 正規化されたパス部分の文字列です。
   */
  public get pathname(): string {
    return this.#url.pathname;
  }

  public set pathname(value: string) {
    this.#url.pathname = value;

    // ルートパス（/）単体である場合を除き、末尾に存在する不要なスラッシュを削除して一貫性を保ちます。
    const pathname = ("/" + this.#url.pathname).replace(MULTI_SLASH, "/");
    if (pathname !== "/" && pathname.endsWith("/")) {
      this.#url.pathname = pathname.substring(0, pathname.length - 1);
    }
  }

  /**
   * 先頭に `?` を含むクエリー文字列です。
   *
   * 常にソートされます。
   */
  public get search(): string {
    this.#url.searchParams.sort();
    return this.#url.search;
  }

  public set search(value: string) {
    this.#url.search = value;
  }

  /**
   * 内部の `URL` インスタンスが保持する、クエリーパラメーターを操作するための `URLSearchParams` オブジェクトを取得します。
   */
  public get searchParams(): URLSearchParams {
    return this.#url.searchParams;
  }

  /**
   * 先頭に `#` を含むハッシュ文字列を取得します。
   */
  public get hash(): string {
    return this.#url.hash;
  }

  public set hash(value: string) {
    this.#url.hash = value;
  }

  /**
   * 現在保持しているすべてのコンポーネントを結合し、ルーティング用のパス文字列として出力します。
   *
   * @returns ソート済みのクエリーおよびハッシュを含んだ、正規化されたパス全体の文字列を返します。
   */
  public toString(): string {
    const { hash, search, pathname } = this;
    return pathname + search + hash;
  }

  /**
   * このインスタンスを複製し、上書き可能な形式で取得します。
   *
   * @returns 上書き可能な {@link RoutePath|`RoutePath`} インスタンスです。
   */
  public clone(): RoutePath {
    return new RoutePath(this.toString());
  }
}

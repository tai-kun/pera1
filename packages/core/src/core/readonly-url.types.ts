/**
 * 読み取り専用の URL 操作を行うためのインターフェースです。
 *
 * 標準の `URL` オブジェクトから、プロパティーへの代入による破壊的な変更を禁止し、安全な参照を可能にします。
 *
 * [MDN リファレンス](https://developer.mozilla.org/docs/Web/API/URL)
 *
 * [プロパティーの構成](https://nodejs.org/api/url.html#url-strings-and-url-objects)
 */
export interface ReadonlyURL {
  /**
   * URL のハッシュ（シャープ記号 `#` を含むフラグメント識別子）を表します。
   *
   * [MDN リファレンス](https://developer.mozilla.org/docs/Web/API/URL/hash)
   */
  readonly hash: string;

  /**
   * URL のホスト情報（ホスト名とポート番号 `hostname:port`）を表します。
   *
   * [MDN リファレンス](https://developer.mozilla.org/docs/Web/API/URL/host)
   */
  readonly host: string;

  /**
   * URL のホスト名を表します。ポート番号は含みません。
   *
   * [MDN リファレンス](https://developer.mozilla.org/docs/Web/API/URL/hostname)
   */
  readonly hostname: string;

  /**
   * 完全にシリアライズされた URL 文字列全体を表します。
   *
   * [MDN リファレンス](https://developer.mozilla.org/docs/Web/API/URL/href)
   */
  readonly href: string;

  /**
   * URL のオリジン（プロトコル、ドメイン、およびポート番号）を表します。
   *
   * [MDN リファレンス](https://developer.mozilla.org/docs/Web/API/URL/origin)
   */
  readonly origin: string;

  /**
   * ドメインの前に指定されたパスワードを表します。
   *
   * [MDN リファレンス](https://developer.mozilla.org/docs/Web/API/URL/password)
   */
  readonly password: string;

  /**
   * 最初のスラッシュ `/` から始まる URL のパス部分を表します。
   *
   * [MDN リファレンス](https://developer.mozilla.org/docs/Web/API/URL/pathname)
   */
  readonly pathname: string;

  /**
   * URL のポート番号を表します。デフォルトのポート番号である場合は空文字列を返します。
   *
   * [MDN リファレンス](https://developer.mozilla.org/docs/Web/API/URL/port)
   */
  readonly port: string;

  /**
   * 末尾のコロン `:` を含む URL のプロトコルスキームを表します。
   *
   * [MDN リファレンス](https://developer.mozilla.org/docs/Web/API/URL/protocol)
   */
  readonly protocol: string;

  /**
   * 先頭のクエスチョンマーク `?` を含む URL のクエリー文字列を表します。
   *
   * [MDN リファレンス](https://developer.mozilla.org/docs/Web/API/URL/search)
   */
  readonly search: string;

  /**
   * クエリーパラメーターを操作するための読み取り専用オブジェクトを返します。
   *
   * [MDN リファレンス](https://developer.mozilla.org/docs/Web/API/URL/searchParams)
   */
  readonly searchParams: ReadonlyURLSearchParams;

  /**
   * ドメインの前に指定されたユーザー名を表します。
   *
   * [MDN リファレンス](https://developer.mozilla.org/docs/Web/API/URL/username)
   */
  readonly username: string;

  /**
   * `href` プロパティーと同じシリアライズされた URL 文字列を返します。
   *
   * @returns URL の文字列表現です。
   *
   * [MDN リファレンス](https://developer.mozilla.org/docs/Web/API/URL/toString)
   */
  toString(): string;

  /**
   * JSON シリアライズの際に呼び出され、`href` プロパティーと同じ文字列を返します。
   *
   * @returns URL の文字列表現です。
   *
   * [MDN リファレンス](https://developer.mozilla.org/docs/Web/API/URL/toJSON)
   */
  toJSON(): string;
}

/**
 * 読み取り専用の URL 検索パラメーターを操作するためのインターフェースです。
 *
 * `URLSearchParams` から破壊的な変更を行うメソッドを排除し、参照専用として定義しています。
 *
 * [MDN Reference](https://developer.mozilla.org/docs/Web/API/URLSearchParams)
 */
export interface ReadonlyURLSearchParams {
  /**
   * 検索パラメーターの総数です。
   *
   * [MDN Reference](https://developer.mozilla.org/docs/Web/API/URLSearchParams/size)
   */
  readonly size: number;

  /**
   * 指定された名前に関連付けられた最初のパラメーターの値を返します。
   *
   * 該当する名前が存在しない場合は `null` を返します。
   *
   * @param name 検索するパラメーターの名前です。
   * @returns パラメーターの値、または `null` です。
   *
   * [MDN Reference](https://developer.mozilla.org/docs/Web/API/URLSearchParams/get)
   */
  get(name: string): string | null;

  /**
   * 指定された名前に関連付けられたすべてのパラメーターの値を配列として返します。
   *
   * 該当する名前が存在しない場合は空の配列を返します。
   *
   * @param name 検索するパラメーターの名前です。
   * @returns パラメーターの値を格納した文字列の配列です。
   *
   * [MDN Reference](https://developer.mozilla.org/docs/Web/API/URLSearchParams/getAll)
   */
  getAll(name: string): string[];

  /**
   * 指定された名前（およびオプションで指定された値）に一致するパラメーターが存在するかどうかを判定します。
   *
   * @param name 判定するパラメーターの名前です。
   * @param value 判定に含めるパラメーターの値です。
   * @returns 一致するパラメーターが存在する場合は `true`、存在しない場合は `false` です。
   *
   * [MDN Reference](https://developer.mozilla.org/docs/Web/API/URLSearchParams/has)
   */
  has(name: string, value?: string): boolean;

  /**
   * すべての検索パラメーターを URL エンコードされた文字列として返します。
   *
   * @returns URL エンコードされたパラメーター文字列です。
   *
   * [MDN Reference](https://developer.mozilla.org/docs/Web/API/URLSearchParams/toString)
   */
  toString(): string;

  /**
   * 検索パラメーターに含まれるすべての要素に対して、指定されたコールバック関数を巡回して実行します。
   *
   * @param callbackfn 各要素に対して実行するコールバック関数です。
   * @param thisArg コールバック関数の実行時に `this` として使用する値です。
   *
   * [MDN Reference](https://developer.mozilla.org/docs/Web/API/URLSearchParams/forEach)
   */
  forEach(
    callbackfn: (value: string, key: string, parent: ReadonlyURLSearchParams) => void,
    thisArg?: any,
  ): void;
}

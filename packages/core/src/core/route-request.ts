import type { ReadonlyFormData } from "./readonly-form-data.types.js";
import type { ReadonlyURL } from "./readonly-url.types.js";

/**
 * HTTP の GET メソッドによるルーティングリクエストを表すインターフェースです。
 *
 * GET リクエストの特性上、`formData` は常に `null` となります。
 */
interface RouteGetRequest {
  /**
   * HTTP メソッドを表します。常に `"GET"` です。
   */
  readonly method: "GET";

  /**
   * リクエスト対象の読み取り専用 URL オブジェクトです。
   */
  readonly url: ReadonlyURL;

  /**
   * 非同期処理やフェッチを中断するための中断シグナルです。
   */
  readonly signal: AbortSignal;

  /**
   * フォームデータです。GET リクエストではデータを本文に含めないため、常に `null` です。
   */
  readonly formData: null;

  /**
   * Web 標準の `Request` オブジェクトに変換します。
   *
   * @param init 変換時に上書きまたは追加するリクエストの設定オプションです。
   * @returns 構築された `Request` インスタンスを返します。
   */
  toRequest(init?: RequestInit): Request;
}

/**
 * HTTP の POST メソッドによるルーティングリクエストを表すインターフェースです。
 *
 * POST リクエストに伴う読み取り専用の `formData` を保持します。
 */
interface RoutePostRequest {
  /**
   * HTTP メソッドを表します。常に `"POST"` です。
   */
  readonly method: "POST";

  /**
   * リクエスト対象の読み取り専用 URL オブジェクトです。
   */
  readonly url: ReadonlyURL;

  /**
   * 非同期処理やフェッチを中断するための中断シグナルです。
   */
  readonly signal: AbortSignal;

  /**
   * リクエスト本文に紐付けられた、読み取り専用のフォームデータです。
   */
  readonly formData: ReadonlyFormData;

  /**
   * Web 標準の `Request` オブジェクトに変換します。
   *
   * @param init 変換時に上書きまたは追加するリクエストの設定オプションです。
   * @returns 構築された `Request` インスタンスを返します。
   */
  toRequest(init?: RequestInit): Request;
}

/**
 * GET または POST のルーティングリクエストを表す識別子付きユニオン型です。
 */
type RouteRequest = RouteGetRequest | RoutePostRequest;

/**
 * `RouteGetRequest` と `RoutePostRequest` の両インターフェースに共通するプロパティーの型を抽出した定義です。
 *
 * 実装クラスにおいて最低限満たすべき型安全性の担保に使用します。
 */
type RouteRequestImpl = {
  [P in keyof RouteGetRequest & keyof RoutePostRequest]: RouteRequest[P];
};

/**
 * ルーティングコンテキストにおける HTTP リクエストを抽象化し、管理するクラスです。
 *
 * メソッドの種類（GET / POST）に応じて、型安全なリクエストの生成と Web 標準の `Request` オブジェクトへの変換を提供します。
 */
const RouteRequest = class RouteRequest implements RouteRequestImpl {
  /**
   * GET メソッド用の `RouteGetRequest` インスタンスを生成するファクトリーメソッドです。
   *
   * @param method HTTP メソッド名（"GET"）です。
   * @param url 読み取り専用の URL オブジェクトです。
   * @param signal 処理中断用の中断シグナルです。
   * @returns `RouteGetRequest` インターフェースを満たすインスタンスを返します。
   */
  public static new(method: "GET", url: ReadonlyURL, signal: AbortSignal): RouteGetRequest;

  /**
   * POST メソッド用の `RoutePostRequest` インスタンスを生成するファクトリーメソッドです。
   *
   * @param method HTTP メソッド名（"POST"）です。
   * @param url 読み取り専用の URL オブジェクトです。
   * @param signal 処理中断用の中断シグナルです。
   * @param formData 読み取り専用のフォームデータです。
   * @returns `RoutePostRequest` インターフェースを満たすインスタンスを返します。
   */
  public static new(
    method: "POST",
    url: ReadonlyURL,
    signal: AbortSignal,
    formData: ReadonlyFormData,
  ): RoutePostRequest;

  public static new(...args: [any, any, any, any?]): RouteRequest {
    return new RouteRequest(...args);
  }

  /**
   * 読み取り専用の URL オブジェクトです。
   */
  public readonly url: ReadonlyURL;

  /**
   * 使用される HTTP メソッドです。
   */
  public readonly method: "GET" | "POST";

  /**
   * 処理中断用の中断シグナルです。
   */
  public readonly signal: AbortSignal;

  /**
   * 保持されている読み取り専用のフォームデータです。GET リクエストの場合は `null` となります。
   */
  public readonly formData: ReadonlyFormData | null;

  /**
   * GET メソッド用の `RouteRequest` インスタンスを初期化するためのコンストラクターオーバーロードです。
   */
  public constructor(method: "GET", url: ReadonlyURL, signal: AbortSignal);

  /**
   * POST メソッド用の `RouteRequest` インスタンスを初期化するためのコンストラクターオーバーロードです。
   */
  public constructor(
    method: "POST",
    url: ReadonlyURL,
    signal: AbortSignal,
    formData: ReadonlyFormData,
  );

  /**
   * `RouteRequest` コンストラクターの実装本体です。
   *
   * 渡された引数をそれぞれのプロパティーに代入して内部状態を初期化します。
   */
  public constructor(
    method: "GET" | "POST",
    url: ReadonlyURL,
    signal: AbortSignal,
    formData: ReadonlyFormData | null = null,
  ) {
    this.url = url;
    this.method = method;
    this.signal = signal;
    this.formData = formData;
  }

  /**
   * インスタンスが保持する情報を基に、Web 標準である Fetch API の `Request` オブジェクトを構築して返します。
   *
   * 外部から任意の `RequestInit` オプションが指定された場合は、インスタンス固有の既定値を上書きします。
   *
   * @param init リクエストの生成オプションを上書きするための初期化オブジェクトです。既定値は空のオブジェクトです。
   * @returns Fetch API でそのまま利用可能な `Request` インスタンスです。
   */
  public toRequest(init: RequestInit = {}): Request {
    const {
      // 内部の型定義の整合性を維持するため、読み取り専用のインターフェースである formData を、標準の Request の body に適合する FormData 型にキャストしています。
      body = this.formData as FormData | null,
      method = this.method,
      signal = this.signal,
      ...other
    } = init;

    return new Request(this.url.href, {
      body,
      method,
      signal,
      ...other,
    });
  }
};

export type { RouteGetRequest, RoutePostRequest };

export default RouteRequest;

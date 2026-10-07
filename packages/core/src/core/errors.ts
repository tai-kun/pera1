import { type ErrorMeta, type ErrorOptions, I18nErrorBase, setErrorMessage } from "i18n-error-base";
import { inspect } from "inspect-lite";
import { isThenable } from "maypromise";
import getTypeName from "type-name";
import type { BaseIssue } from "valibot";

/**************************************************************************************************/

export type { ErrorMeta, ErrorOptions };
export { setErrorMessage };

/**************************************************************************************************/

/**
 * データ検証の過程で検出された具体的な問題点です。
 *
 * 外部のスキーマ検証ライブラリーである `valibot` の `BaseIssue` を基盤としています。
 */
export type Issue = BaseIssue<unknown>;

/**************************************************************************************************/

/**
 * pera1 ルーティングライブラリーにおける、すべてのカスタムエラーの頂点に位置する基底クラスです。
 *
 * @template TMeta エラーの発生コンテキストを保持するために紐付けるメタデータオブジェクトです。
 */
export class ErrorBase<
  TMeta extends ErrorMeta | undefined = undefined,
> extends I18nErrorBase<TMeta> {}

/**************************************************************************************************/

/**
 * プログラムの制御フローにおいて、理論上到達しないはずのコード領域へ侵入した際に付与されるメタデータです。
 */
export type UnreachableErrorMeta = {
  /**
   * 網羅性チェックをすり抜けて、実行時に入り込んできた予期せぬ不正な値です。
   */
  readonly value?: unknown;
};

/**
 * `UnreachableError` のインスタンスを初期化する際に渡される引数オブジェクトです。
 */
export type UnreachableErrorArgs = ErrorOptions & {
  /**
   * 網羅性検証において `never` 型となるべき変数を格納した、要素数 1 のタプルまたは空の配列です。
   */
  readonly actual: [never?];
};

/**
 * 網羅性チェックにおいて、プログラムの制御フローが理論上決して到達しないはずの場所に達した場合に投げるエラーです。
 */
export class UnreachableError extends ErrorBase<UnreachableErrorMeta> {
  static {
    this.prototype.name = "Pera1UnreachableError";
  }

  /**
   * `UnreachableError` クラスの新しいインスタンスを初期化します。
   *
   * @param args エラーオプションおよび実行時に混入した実際の値を含む引数オブジェクトです。
   */
  public constructor(args: UnreachableErrorArgs) {
    const { actual, ...options } = args;
    super(
      actual.length > 0 ? { value: actual[0] } : {},
      (meta) =>
        "value" in meta
          ? "Encountered impossible value: " + inspect(meta.value)
          : "Unreachable code reached",
      options,
    );
  }
}

/*#__PURE__*/ setErrorMessage(
  UnreachableError,
  (meta) =>
    "value" in meta
      ? "不可能な値に遭遇しました: " + inspect(meta.value)
      : "到達できないコードに到達しました",
  "ja",
);

/**************************************************************************************************/

/**
 * データ検証の失敗に関連するエラーを集約するための共通基底クラスです。
 *
 * @template TMeta エラーに紐づく、検証結果の問題点などのメタデータです。
 */
export class ValidationErrorBase<
  TMeta extends ErrorMeta | undefined = ErrorMeta | undefined,
> extends ErrorBase<TMeta> {}

/**************************************************************************************************/

/**
 * 予期しないデータ構造や型に遭遇した際に付与される、検証エラー情報のメタデータです。
 */
export type UnexpectedValidationErrorMeta = {
  /**
   * スキーマ検証によって不適合と判定された問題点のリストです。
   * 最低 1 つ以上の要素を持つことが保証された読み取り専用の配列です。
   */
  readonly issues: readonly [Issue, ...Issue[]];

  /**
   * 検証の対象となった、予期しない生の入力値です。
   */
  readonly value: unknown;
};

/**
 * `UnexpectedValidationError` のインスタンスを初期化する際に渡される引数オブジェクトです。
 */
export type UnexpectedValidationErrorArgs = ErrorOptions & UnexpectedValidationErrorMeta;

/**
 * スキーマによるデータ構造の検証において、予期しない形式の値に遭遇した場合に投げるエラーです。
 */
export class UnexpectedValidationError extends ValidationErrorBase<UnexpectedValidationErrorMeta> {
  static {
    this.prototype.name = "Pera1UnexpectedValidationError";
  }

  /**
   * `UnexpectedValidationError` クラスの新しいインスタンスを初期化します。
   *
   * @param args エラーオプション、入力値、および検出された不適合箇所の一覧を含む引数オブジェクトです。
   */
  public constructor(args: UnexpectedValidationErrorArgs) {
    const { value, issues, ...options } = args;
    super(
      { value, issues },
      ({ issues }) => issues.map((issue) => issue.message).join(": "),
      options,
    );
  }
}

/**************************************************************************************************/

/**
 * ブラウザー標準の Navigation API が、現在の実行環境でサポートされていない場合に投げるエラーです。
 */
export class NavigationApiNotSupportedError extends ErrorBase<undefined> {
  static {
    this.prototype.name = "Pera1NavigationApiNotSupportedError";
  }

  /**
   * `NavigationApiNotSupportedError` クラスの新しいインスタンスを初期化します。
   *
   * @param options エラーの共通オプションです。
   */
  public constructor(options?: ErrorOptions) {
    super("The Navigation API is not supported in this environment", options);
  }
}

/*#__PURE__*/ setErrorMessage(
  NavigationApiNotSupportedError,
  "現在の環境では Navigation API がサポートされていません",
  "ja",
);

/**************************************************************************************************/

/**
 * データの再読み込み判定において、不正なデータ型が検出された際に付与されるメタデータです。
 */
export type LoaderConditionErrorMeta = {
  /**
   * エラーが発生した対象ルートの URL パス文字列です。
   */
  readonly url: string;

  /**
   * 不正な値を返した対象の `shouldReload` 関数の参照です。
   */
  readonly shouldReload: Function;

  /**
   * `shouldReload` 関数が実際に返した、期待値とは異なるオブジェクトやプリミティブ値です。
   */
  readonly returnValue: unknown;
};

/**
 * `LoaderConditionError` のインスタンスを初期化する際に渡される引数オブジェクトです。
 */
export type LoaderConditionErrorArgs = ErrorOptions & LoaderConditionErrorMeta;

/**
 * ユーザーが定義した `shouldReload` 関数が、仕様に準拠した同期的な真偽値ではなく、不正な値を返した場合に投げるエラーです。
 */
export class LoaderConditionError extends ErrorBase<LoaderConditionErrorMeta> {
  static {
    this.prototype.name = "Pera1LoaderConditionError";
  }

  /**
   * `LoaderConditionError` クラスの新しいインスタンスを初期化します。
   *
   * @param args エラーオプション、対象 URL、関数の参照、および実際の戻り値を含む引数オブジェクトです。
   */
  public constructor(args: LoaderConditionErrorArgs) {
    const { url, returnValue, shouldReload, ...options } = args;
    super(
      { url, returnValue, shouldReload },
      ({ returnValue }) =>
        isThenable(returnValue)
          ? "shouldReload must return a boolean value synchronously"
          : `Expected boolean, but got ${getTypeName(returnValue) || "unknown"}`,
      options,
    );
  }
}

/*#__PURE__*/ setErrorMessage(
  LoaderConditionError,
  ({ returnValue }) =>
    isThenable(returnValue)
      ? "shouldReload は同期的に真偽値を返す必要があります"
      : `真偽値を期待しましたが、${getTypeName(returnValue) || "unknown"} を得ました`,
  "ja",
);

/**************************************************************************************************/

/**
 * ルーター全体の共通状態 `RouterContext` が、React のコンポーネントツリー内の上位から供給されていない場合に投げるエラーです。
 */
export class RouterContextMissingError extends ErrorBase<undefined> {
  static {
    this.prototype.name = "Pera1RouterContextMissingError";
  }

  /**
   * `RouterContextMissingError` クラスの新しいインスタンスを初期化します。
   *
   * @param options エラーの共通オプションです。
   */
  public constructor(options?: ErrorOptions) {
    super("RouterContext not found. Did you forget to wrap your app in <Router />?", options);
  }
}

/*#__PURE__*/ setErrorMessage(
  RouterContextMissingError,
  "RouterContext が見つかりません。アプリを <Router /> で囲むのを忘れていませんか？",
  "ja",
);

/**************************************************************************************************/

/**
 * 個々のルート固有の状態 `RouteContext` が、React のコンポーネントツリー内の上位から供給されていない場合に投げるエラーです。
 */
export class RouteContextMissingError extends ErrorBase<undefined> {
  static {
    this.prototype.name = "Pera1RouteContextMissingError";
  }

  /**
   * `RouteContextMissingError` クラスの新しいインスタンスを初期化します。
   *
   * @param options エラーの共通オプションです。
   */
  public constructor(options?: ErrorOptions) {
    super("RouteContext not found. Did you forget to wrap your app in <Router />?", options);
  }
}

/*#__PURE__*/ setErrorMessage(
  RouteContextMissingError,
  "RouteContext が見つかりません。アプリを <Router /> で囲むのを忘れていませんか？",
  "ja",
);

/**************************************************************************************************/

/**
 * ローダーデータの紛失を通知する際に付与されるメタデータです。
 */
export type LoaderDataNotFoundErrorMeta = {
  /**
   * データの取得を試みた対象のローダー関数の参照です。
   * 未定義の場合は `undefined` となることがあります。
   */
  readonly loader: Function | undefined;
};

/**
 * `LoaderDataNotFoundError` のインスタンスを初期化する際に渡される引数オブジェクトです。
 */
export type LoaderDataNotFoundErrorArgs = ErrorOptions & LoaderDataNotFoundErrorMeta;

/**
 * ルートに紐づくデータ取得用のローダー関数が正常に処理されたはずであるにもかかわらず、該当するキャッシュデータや応答結果が見つからない場合に投げるエラーです。
 */
export class LoaderDataNotFoundError extends ErrorBase<LoaderDataNotFoundErrorMeta> {
  static {
    this.prototype.name = "Pera1LoaderDataNotFoundError";
  }

  /**
   * `LoaderDataNotFoundError` クラスの新しいインスタンスを初期化します。
   *
   * @param args エラーオプションおよび対象ローダー関数の参照を含む引数オブジェクトです。
   */
  public constructor(args: LoaderDataNotFoundErrorArgs) {
    const { loader, ...options } = args;
    super(
      { loader },
      ({ loader }) =>
        loader
          ? `Loader data not found (Function name: ${loader.name || "anonymous"})`
          : "Loader is undefined",
      options,
    );
  }
}

/*#__PURE__*/ setErrorMessage(
  LoaderDataNotFoundError,
  ({ loader }) =>
    loader
      ? `ローダーデータが見つかりません（関数名: ${loader.name || "匿名"}）`
      : "ローダーが未定義です。",
  "ja",
);

/**************************************************************************************************/

/**
 * ルートパターンの不一致を通知する際に付与されるメタデータです。
 */
export type RoutePatternMismatchErrorMeta = {
  /**
   * ルートパターン文字列です。
   */
  readonly route: string;

  /**
   * 検証対象のパス文字列です。
   */
  readonly target: string;
};

/**
 * `RoutePatternMismatchError` のインスタンスを初期化する際に渡される引数オブジェクトです。
 */
export type RoutePatternMismatchErrorArgs = ErrorOptions & RoutePatternMismatchErrorMeta;

/**
 * 対象のパスまたは URL が、指定されたルートパターンに一致しない場合に投げるエラーです。
 */
export class RoutePatternMismatchError extends ErrorBase<RoutePatternMismatchErrorMeta> {
  static {
    this.prototype.name = "Pera1RoutePatternMismatchError";
  }

  /**
   * `RoutePatternMismatchError` クラスの新しいインスタンスを初期化します。
   *
   * @param args 引数オブジェクトです。
   */
  public constructor(args: RoutePatternMismatchErrorArgs) {
    const { route, target, ...options } = args;
    super(
      { route, target },
      ({ route, target }) =>
        `The target path "${target}" does not match the route pattern "${route}"`,
      options,
    );
  }
}

/*#__PURE__*/ setErrorMessage(
  RoutePatternMismatchError,
  ({ route, target }) => `対象パス "${target}" がパターン "${route}" と一致しません`,
  "ja",
);

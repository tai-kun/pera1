import { inject, parse } from "regexparam";

import type { RouteParams } from "./_regexparam.js";
import { RoutePatternMismatchError } from "./errors.js";
import RoutePath from "./route-path.js";

/**
 * 対象の型プロパティーをすべて任意とし、さらに各プロパティー値に undefined を許容する型です。
 *
 * @template T オブジェクトの型定義です。
 */
type Optional<T> = {
  readonly [P in keyof T]?: T[P] | undefined;
};

/**
 * ルートパターンの照合処理において、URL の文字列情報を抽出するためのインターフェースです。
 */
export interface RoutePatternMatchURL {
  /**
   * ホスト名を除いた URL パス全体の文字列を表します。
   */
  readonly pathname: string;
}

/**
 * 引数に渡された対象から URL パスを取得し、一貫した形式に正規化します。
 *
 * @param target 文字列または URL 情報を持つオブジェクトです。
 * @returns 正規化されたパス文字列です。
 */
function normalizeTarget(target: string | RoutePatternMatchURL): string {
  return new RoutePath(typeof target === "string" ? target : target.pathname).pathname;
}

/**
 * ルートパターンを解析および処理する際の挙動を設定するオプションです。
 */
export type RoutePatternUtilsOptions = {
  /**
   * 子ディレクトリーへの前方一致を許可するかどうかを制御するフラグです。下位パスが存在する場合にも一致とみなす場合に true を指定します。
   *
   * @default false
   */
  readonly allowChild?: boolean | undefined;
};

/**
 * ルートパターンの解析などを行うユーティリティークラスです。
 *
 * @template TRoutePattern リテラル型で固定されたルートパターンの文字列定義です。
 */
export default class RoutePatternUtils<const TRoutePattern extends string = string> {
  /**
   * ルートパターンと対象のパスが一致するかどうかを静的に検証します。
   *
   * @template TRoutePattern パターンの文字列型です。
   * @param routePattern 基準となるルートパターン文字列です。
   * @param target 検証対象のパス文字列またはオブジェクトです。
   * @param options 解析時の振る舞いを制御するオプションです。
   * @returns 一致する場合は true、一致しない場合は false です。
   */
  public static match<const TRoutePattern extends string>(
    routePattern: TRoutePattern,
    target: string | RoutePatternMatchURL,
    options?: RoutePatternUtilsOptions,
  ): boolean {
    return new RoutePatternUtils(routePattern, options).match(target);
  }

  /**
   * 静的な解析を行い、対象のパスからパラメーターを抽出します。一致しない場合はエラーを投げます。
   *
   * @template TRoutePattern パターンの文字列型です。
   * @param routePattern 基準となるルートパターン文字列です。
   * @param target 解析対象のパス文字列またはオブジェクトです。
   * @param options 解析時の振る舞いを制御するオプションです。
   * @returns 抽出されたパラメーターオブジェクトです。
   */
  public static parse<const TRoutePattern extends string>(
    routePattern: TRoutePattern,
    target: string | RoutePatternMatchURL,
    options?: RoutePatternUtilsOptions,
  ): RouteParams<TRoutePattern> {
    return new RoutePatternUtils(routePattern, options).parse(target);
  }

  /**
   * 静的な埋め込みを行い、ルートパターンにパラメーターを適用してパスを生成します。
   *
   * @template TRoutePattern パターンの文字列型です。
   * @param routePattern 基準となるルートパターン文字列です。
   * @param params 埋め込むパラメーターのキーと値の組み合わせです。
   * @param options 解析時の振る舞いを制御するオプションです。
   * @returns パラメーターが適用された新しいパス文字列です。
   */
  public static inject<const TRoutePattern extends string>(
    routePattern: TRoutePattern,
    params: Readonly<RouteParams<TRoutePattern>>,
    options?: RoutePatternUtilsOptions,
  ): string {
    return new RoutePatternUtils(routePattern, options).inject(params);
  }

  // public static partialInject<const TRoutePattern extends string>(
  //   routePattern: TRoutePattern,
  //   params: Optional<RouteParams<TRoutePattern>>,
  //   options: RoutePatternUtilsOptions = {},
  // ): string {}

  /**
   * 対象のパスに含まれるパラメーターの一部を指定された値で置き換えて、新しいパスを静的に生成します。
   *
   * @template TRoutePattern パターンの文字列型です。
   * @param routePattern 基準となるルートパターン文字列です。
   * @param target 既存のパス文字列またはオブジェクトです。
   * @param params 上書きするパラメーターです。
   * @param options 解析時の振る舞いを制御するオプションです。
   * @returns 置き換え後のパス文字列です。
   */
  public static replace<const TRoutePattern extends string>(
    routePattern: TRoutePattern,
    target: string | RoutePatternMatchURL,
    params: Optional<RouteParams<TRoutePattern>>,
    options?: RoutePatternUtilsOptions,
  ): string {
    return new RoutePatternUtils(routePattern, options).replace(target, params);
  }

  /**
   * 静的な解析を行い、対象のパスからパラメーターを安全に抽出します。一致しない場合は null を返します。
   *
   * @template TRoutePattern パターンの文字列型です。
   * @param routePattern 基準となるルートパターン文字列です。
   * @param target 解析対象のパス文字列またはオブジェクトです。
   * @param options 解析時の振る舞いを制御するオプションです。
   * @returns 抽出されたパラメーターオブジェクト、一致しない場合は null です。
   */
  public static parseSafe<const TRoutePattern extends string>(
    routePattern: TRoutePattern,
    target: string | RoutePatternMatchURL,
    options?: RoutePatternUtilsOptions,
  ): RouteParams<TRoutePattern> | null {
    return new RoutePatternUtils(routePattern, options).parseSafe(target);
  }

  // public static injectSafe<const TRoutePattern extends string>(
  //   routePattern: TRoutePattern,
  //   params: Readonly<RouteParams<TRoutePattern>>,
  //   options: RoutePatternUtilsOptions = {},
  // ): string | null {}

  /**
   * 対象のパスに含まれるパラメーターの一部を指定された値で安全に置き換えます。不一致の場合は null を返します。
   *
   * @template TRoutePattern パターンの文字列型です。
   * @param routePattern 基準となるルートパターン文字列です。
   * @param target 既存のパス文字列またはオブジェクトです。
   * @param params 上書きするパラメーターです。
   * @param options 解析時の振る舞いを制御するオプションです。
   * @returns 置き換え後のパス文字列、不一致の場合は null です。
   */
  public static replaceSafe<const TRoutePattern extends string>(
    routePattern: TRoutePattern,
    target: string | RoutePatternMatchURL,
    params: Optional<RouteParams<TRoutePattern>>,
    options?: RoutePatternUtilsOptions,
  ): string | null {
    return new RoutePatternUtils(routePattern, options).replaceSafe(target, params);
  }

  /**
   * インスタンスに保持されるルートパターン文字列です。
   */
  public readonly route: string;

  /**
   * ルートパターンのマッチングとパラメーター抽出に使用する正規表現オブジェクトです。
   */
  public readonly pattern: RegExp;

  /**
   * ルートパターンから抽出されたパラメーター名の配列です。
   */
  public readonly paramKeys: readonly Extract<keyof RouteParams<TRoutePattern>, string>[];

  /**
   * 新しい `RoutePatternUtils` インスタンスを作成します。
   *
   * @param routePattern 解析基準となるルートパターンです。
   * @param options 前方一致などを制御するオプションです。
   */
  public constructor(routePattern: TRoutePattern, options: RoutePatternUtilsOptions = {}) {
    const { keys, pattern } = parse(routePattern, options.allowChild);
    this.route = routePattern;
    this.pattern = pattern;
    this.paramKeys = keys satisfies string[] as any[];
  }

  /**
   * パスが構築時のルートパターンに一致するかどうかを評価します。
   *
   * @param target 検証対象のパス文字列またはオブジェクトです。
   * @returns パターンに合致する場合は true、それ以外は false です。
   */
  public match(target: string | RoutePatternMatchURL): boolean {
    target = normalizeTarget(target);
    return this.pattern.test(target);
  }

  /**
   * インスタンスのルートパターンを基に対象パスからパラメーターを抽出します。解析できない場合は、処理が継続できないため例外を投げます。
   *
   * @param target 解析対象のパス文字列またはオブジェクトです。
   * @returns 抽出したパラメーターオブジェクトです。
   */
  public parse(target: string | RoutePatternMatchURL): RouteParams<TRoutePattern> {
    const params = this.parseSafe(target);
    if (params === null) {
      throw new RoutePatternMismatchError({
        route: this.route,
        target: normalizeTarget(target),
      });
    }

    return params;
  }

  /**
   * 指定されたパラメーター群をルートパターンに埋め込んで、具体的なパス文字列を構築します。
   *
   * @param params パラメーターのキーと値のオブジェクトです。
   * @returns 生成されたパス文字列です。
   */
  public inject(params: Readonly<RouteParams<TRoutePattern>>): string {
    return inject(this.route, params);
  }

  // public partialInject(params: Optional<RouteParams<TRoutePattern>>): string {}

  /**
   * 現在のパスに含まれるパラメーター値の一部を、指定された値で上書きした新しいパスを構築します。対象パスがルートパターンと一致しない場合は例外を投げます。
   *
   * @param target 基準となる現在のパス文字列またはオブジェクトです。
   * @param params 変更を適用する一部のパラメーターです。
   * @returns 新しく生成されたパス文字列です。
   */
  public replace(
    target: string | RoutePatternMatchURL,
    params: Optional<RouteParams<TRoutePattern>>,
  ): string {
    const replaced = this.replaceSafe(target, params);
    if (replaced === null) {
      throw new RoutePatternMismatchError({
        route: this.route,
        target: normalizeTarget(target),
      });
    }

    return replaced;
  }

  /**
   * パターンに基づきパスの解析を行い、プレースホルダーに該当する箇所をオブジェクトとして抽出します。
   *
   * @param target 解析対象のパス文字列またはオブジェクトです。
   * @returns 抽出に成功した場合はパラメーターのオブジェクト、不一致の場合は null です。
   */
  public parseSafe(target: string | RoutePatternMatchURL): RouteParams<TRoutePattern> | null {
    target = normalizeTarget(target);
    const matches = this.pattern.exec(target);
    if (!matches) {
      return null;
    }

    const params: Record<string, string> = {};
    for (let i = 0, param: string | undefined; i < this.paramKeys.length; i++) {
      // exec メソッドの戻り値のインデックス 0 にはマッチした文字列全体が格納されているため、各パラメーターの値はインデックス 1 以降（i + 1）から取得します。
      param = matches[i + 1];

      // キャプチャーされたセグメントが存在し、かつ文字列型である場合にのみ、対応するパラメーターキーと値をマッピングします。
      // オプショナルなパラメーターが URL 側で省略されている場合は undefined となるため、この条件節により除外されます。
      if (typeof param === "string") {
        params[this.paramKeys[i]!] = param;
      }
    }

    return params as RouteParams<TRoutePattern>;
  }

  // public injectSafe(params: Readonly<RouteParams<TRoutePattern>>): string | null {
  //   if (!this.paramKeys.every((key) => key in params && typeof params[key] === "string")) {
  //     return null;
  //   }

  //   return inject(this.route, params);
  // }

  /**
   * 既存のパスから抽出されたパラメーター値をベースとして、任意のパラメーターのみを上書きしたパス文字列を再構築します。
   *
   * @param target 基にするパス文字列またはオブジェクトです。
   * @param params 上書き指定するパラメーターオブジェクトです。
   * @returns 再構築されたパス文字列、パスが不一致の場合は null です。
   */
  public replaceSafe(
    target: string | RoutePatternMatchURL,
    params: Optional<RouteParams<TRoutePattern>>,
  ): string | null {
    const defaults = this.parseSafe(target);
    if (defaults === null) {
      return null;
    }

    const values: Record<string, any> = {};
    for (const key of this.paramKeys) {
      const param = params[key];
      if (typeof param === "string") {
        values[key] = param;
      } else {
        values[key] = defaults[key];
      }
    }

    return inject(this.route, values);
  }
}

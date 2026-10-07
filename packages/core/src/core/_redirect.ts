import RedirectResponse from "./redirect-response.js";
import RoutePatternUtils from "./route-pattern-utils.js";
import type {
  LoaderFunction,
  LoaderFunctionArgs,
  RouteParams,
  ShouldReloadFunction,
  ShouldReloadFunctionArgs,
} from "./route.types.js";

/**
 * `redirect` の作成時に必要となる引数オブジェクトの型定義です。
 */
export type CreateRedirectLoaderArgs = {
  /**
   * 誘導元となるルートの解決済み完全パスです。
   */
  readonly fullPath: string;

  /**
   * 誘導先のパス文字列です。
   */
  readonly template: unknown;

  /**
   * 利用者が定義した本来のローダー関数です。
   */
  readonly loader: LoaderFunction | undefined;

  /**
   * 利用者が定義した本来の再読み込み判定関数です。
   */
  readonly shouldReload: ShouldReloadFunction | undefined;
};

/**
 * `redirect` の解決結果として生成されるローダーと再読み込み判定関数の組です。
 */
export type CreatedRedirectLoader = {
  /**
   * 検証済みの誘導先パス文字列です。
   */
  readonly template: string;

  /**
   * 裸パスでのみ `RedirectResponse` を返す合成ローダー関数です。
   */
  readonly loader: LoaderFunction;

  /**
   * リダイレクト結果の再利用を防ぐ合成判定関数です。
   */
  readonly shouldReload: ShouldReloadFunction;
};

/**
 * 誘導先文字列をパス・クエリー・ハッシュに分解します。
 *
 * @param template 分解対象の誘導先文字列です。
 * @returns パス・クエリー・ハッシュに分解した結果です。
 */
function splitDestination(template: string): {
  readonly pathname: string;
  readonly search: string;
  readonly hash: string;
} {
  let rest = template;
  let hash = "";

  const hashIndex = rest.indexOf("#");

  if (hashIndex !== -1) {
    hash = rest.slice(hashIndex);
    rest = rest.slice(0, hashIndex);
  }

  let search = "";
  const searchIndex = rest.indexOf("?");
  let pathname = rest;

  if (searchIndex !== -1) {
    search = rest.slice(searchIndex);
    pathname = rest.slice(0, searchIndex);
  }

  return { pathname, search, hash };
}

/**
 * 誘導先パス文字列を解決し、遷移可能な絶対パス文字列を構築します。
 *
 * 先頭が `/` なら絶対パスとして扱います。
 *
 * 含まれる `:param` プレースホルダーはマッチ時のパラメーターで埋めます。
 *
 * それ以外なら裸パスに対する相対パスとして解決します。
 *
 * @param template 誘導先のパス文字列です。
 * @param params 現在の URL から抽出されたパスパラメーターです。
 * @param basePathname 相対解決の基準となる裸パスのパス名です。
 * @returns 解決済みの絶対パス文字列です。
 */
export function resolveRedirectDestination(
  template: string,
  params: RouteParams,
  basePathname: string,
): string {
  const { pathname, search, hash } = splitDestination(template);

  let resolved = pathname === "" ? "/" : pathname;

  if (!resolved.startsWith("/")) {
    const segments = resolved.split("/");

    if (resolved === "." || resolved === ".." || segments.includes("..")) {
      throw new Error(
        `[pera1] redirect "${template}" uses an unsupported parent path (".."). Use an absolute path instead.`,
      );
    }

    const relative = resolved.replace(/^(?:\.\/)+/, "");

    if (relative === "" || relative === ".") {
      throw new Error(`[pera1] redirect "${template}" must point to a different path.`);
    }

    const base =
      basePathname.length > 1 && basePathname.endsWith("/")
        ? basePathname.slice(0, -1)
        : basePathname;

    resolved = (base === "/" ? "" : base) + "/" + relative;
  }

  if (resolved.includes(":")) {
    resolved = RoutePatternUtils.inject(resolved, params as Record<string, string>);
  }

  return resolved + search + hash;
}

/**
 * `redirect` の宣言を検証し、裸パスのみで発火する合成ローダーを生成します。
 *
 * 合成ローダーは loader redirect 自動遷移と連携します。
 *
 * 完全一致の裸パスでは利用者のローダーを先に実行します。
 *
 * 利用者が `RedirectResponse` を返した場合はそちらを優先します。
 *
 * 利用者がリダイレクトしなかった場合のみ誘導先への `RedirectResponse` を返します。
 *
 * 子パスでは利用者のローダー結果をそのまま通します。
 *
 * 合成判定関数は裸パスが絡む遷移で必ず再実行します。
 *
 * リダイレクト結果が子遷移時に再利用されるのを防ぐためです。
 *
 * それ以外の遷移では利用者の判定関数または既定値に委ねます。
 *
 * @param args 解決済み完全パス・誘導先・利用者のローダーと判定関数です。
 * @returns 検証済み誘導先と合成ローダー・合成判定関数の組です。
 */
export function createRedirectLoader(args: CreateRedirectLoaderArgs): CreatedRedirectLoader {
  const { fullPath, template, loader: userLoader, shouldReload: userShouldReload } = args;

  if (typeof template !== "string" || template.length === 0) {
    throw new Error(`[pera1] redirect of "${fullPath}" must be a non-empty string.`);
  }

  const destination: string = template;
  const { pathname } = splitDestination(destination);
  const source = pathname === "" ? "/" : pathname;

  if (
    !source.startsWith("/") &&
    (source === "." || source === ".." || source.split("/").includes(".."))
  ) {
    throw new Error(
      `[pera1] redirect of "${fullPath}" uses an unsupported path ("${destination}"). Use an absolute path or a child-relative path instead.`,
    );
  }

  const exact = new RoutePatternUtils(fullPath);

  async function loader(loaderArgs: LoaderFunctionArgs): Promise<unknown> {
    if (!exact.match(loaderArgs.request.url)) {
      return typeof userLoader === "function" ? await userLoader(loaderArgs) : undefined;
    }

    if (typeof userLoader === "function") {
      const userData = await userLoader(loaderArgs);

      if (userData instanceof RedirectResponse) {
        return userData;
      }
    }

    return new RedirectResponse(
      resolveRedirectDestination(
        destination,
        loaderArgs.params,
        loaderArgs.request.url.pathname,
      ),
    );
  }

  function shouldReload(reloadArgs: ShouldReloadFunctionArgs): boolean {
    if (exact.match(reloadArgs.prevUrl) || exact.match(reloadArgs.currentUrl)) {
      return true;
    }

    if (typeof userShouldReload === "function") {
      return userShouldReload(reloadArgs);
    }

    return reloadArgs.defaultShouldReload;
  }

  return {
    template: destination,
    loader,
    shouldReload,
  };
}

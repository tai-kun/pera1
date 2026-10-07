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
 * 裸パス誘導の対象探索に必要な最小情報です。
 */
export type BarePathEntry = {
  /**
   * 解決済みの完全パスです。
   */
  readonly fullPath: string;

  /**
   * インデックスルートかどうかです。
   */
  readonly index: boolean;

  /**
   * 定義順序です。
   *
   * フラット化前の並びを表し、同点時の決定に使います。
   */
  readonly order: number;
};

/**
 * 裸パス誘導の合成に必要となる引数オブジェクトです。
 */
export type CreateBarePathLoaderArgs = {
  /**
   * 誘導元となるルートの解決済み完全パスです。
   */
  readonly fullPath: string;

  /**
   * 自動決定された誘導先のパスパターンです。
   */
  readonly target: string;

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
 * 裸パス誘導の解決結果として生成されるローダーと再読み込み判定関数の組です。
 */
export type CreatedBarePathLoader = {
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
 * パスパターンを `/` 区切りのセグメント配列に分解します。
 *
 * @param path 分解対象のパスパターン文字列です。
 * @returns 空文字を除いたセグメント配列です。
 */
function splitSegments(path: string): string[] {
  return path.split("/").filter(Boolean);
}

/**
 * 裸パスの誘導先を子の `index: true` から自動決定します。
 *
 * 同一パスの index が存在する場合は通常描画で足りるため `undefined` を返します。
 *
 * 候補はワイルドカードを含まないものに限り、追加セグメント最少のものを選びます。
 *
 * 同点時は定義順序が早いものを選びます。
 *
 * @param entries 順序付きのフラット化済みエントリー配列です。
 * @param parentPath 誘導元となる裸パスの完全パスです。
 * @returns 誘導先のパスパターン、該当なしの場合は `undefined` です。
 */
export function findIndexChildTarget(
  entries: readonly BarePathEntry[],
  parentPath: string,
): string | undefined {
  if (entries.some((entry) => entry.index && entry.fullPath === parentPath)) {
    return undefined;
  }
  const prefix = parentPath === "/" ? "//" : parentPath + "/";
  let best: BarePathEntry | undefined;
  let bestExtra = Number.POSITIVE_INFINITY;
  for (const entry of entries) {
    if (!entry.index || entry.fullPath === parentPath) {
      continue;
    }
    if (entry.fullPath.includes("*") || parentPath.includes("*")) {
      continue;
    }
    if (!entry.fullPath.startsWith(prefix)) {
      continue;
    }
    const extra = splitSegments(entry.fullPath).length - splitSegments(parentPath).length;
    if (extra <= 0) {
      continue;
    }
    if (best === undefined || extra < bestExtra) {
      best = entry;
      bestExtra = extra;
    }
  }
  return best?.fullPath;
}

/**
 * 誘導先パターンにマッチ時のパラメーターを埋めて絶対パス文字列を構築します。
 *
 * @param template 誘導先のパスパターンです。
 * @param params 現在の URL から抽出されたパスパラメーターです。
 * @returns 解決済みの絶対パス文字列です。
 */
export function resolveRedirectDestination(template: string, params: RouteParams): string {
  return template.includes(":") ? RoutePatternUtils.inject(template, params) : template;
}

/**
 * 裸パスのみで発火する合成ローダーと再読み込み判定関数を生成します。
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
 * @returns 合成ローダー・合成判定関数の組です。
 */
export function createBarePathLoader(args: CreateBarePathLoaderArgs): CreatedBarePathLoader {
  const { fullPath, target, loader: userLoader, shouldReload: userShouldReload } = args;
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
    return new RedirectResponse(resolveRedirectDestination(target, loaderArgs.params));
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

  return { loader, shouldReload };
}

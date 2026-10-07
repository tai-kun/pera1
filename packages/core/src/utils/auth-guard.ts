import RedirectResponse from "../core/redirect-response.js";
import redirect from "./redirect.js";

/**
 * ログイン前後で遷移先を受け渡すときのパラメーター名です。
 *
 * 未認証時のログインページ誘導 (`loginUrlFor`) のクエリーと、ログイン画面の hidden input で同じ名前を使います。
 */
export const REDIRECT_TO_PARAM = "redirectTo";

/**
 * ガード用ヘルパーが受け付ける最小限のリクエスト形状です。
 *
 * ローダーの `request` (`RouteGetRequest`) をそのまま渡せます。
 */
export type AuthGuardRequest = {
  /**
   * 現在の URL です。
   *
   * `pathname` と `search` からログイン後の復帰先を組み立てます。
   */
  readonly url: {
    readonly pathname: string;
    readonly search: string;
  };
};

/**
 * ログイン後の遷移先として安全な同一オリジンパスだけを通します。
 *
 * `/` で始まり 2 文字目が `/` でも `\` でもない値を安全とみなします。バックスラッシュや空白・制御文字を含む値はブラウザーの正規化で別オリジンに化ける可能性があるため受け付けません。`%2f` のような符号化や二重符号化による回避も検出するため、復号後の形の接頭辞も検査します。検査を通過した場合は元の値をそのまま返します。
 *
 * @param value 検査する遷移先の値です。
 * @param fallback 安全でない値の代わりに返すパスです。
 * @returns 安全な遷移先の値、またはフォールバックです。
 */
export function sanitizeRedirectTo(value: string | null | undefined, fallback = "/"): string {
  const fallbackPath = isRawRedirectTarget(fallback) ? fallback : "/";
  const candidate = (value ?? "").trim();
  if (!isRawRedirectTarget(candidate)) {
    return fallbackPath;
  }
  // 符号化された攻撃 (`/%2f` や `/%252f` など) は復号すると `//` や `/\` に化けるため、復号後の接頭辞も検査します。
  if (!hasSafeRedirectPrefix(stripUrlIgnoredChars(decodeRedirectTarget(candidate)).trim())) {
    return fallbackPath;
  }
  return candidate;
}

/**
 * 未ログイン時にログインページへ誘導するための URL を組み立てます。
 *
 * 現在の `pathname` と `search` を `redirectTo` クエリーに符号化して埋め込むため、ログイン後の復帰先が失われません。ログイン画面では受け取った値を `sanitizeRedirectTo` で検証してから使います。
 *
 * @param pathname 現在のパスです。
 * @param search 現在のクエリーです。
 * @param loginPath ログインページのパスです。
 * @returns ログインページの URL です。
 */
export function loginUrlFor(pathname: string, search = "", loginPath = "/login"): string {
  return `${loginPath}?${REDIRECT_TO_PARAM}=${encodeURIComponent(`${pathname}${search}`)}`;
}

/**
 * `redirectToLogin` の動作を調整する設定です。
 */
export type RedirectToLoginOptions = {
  /**
   * ログインページのパスです。
   *
   * @default "/login"
   */
  readonly loginPath?: string;
};

/**
 * 未認証時のログインページ誘導を表すレスポンスを作成します。
 *
 * ローダーの先頭で現在のユーザーが存在しないときに返します。現在のパスは `redirectTo` クエリーに保存されるため、ログイン画面は認証後に元のページへ復帰できます。ユーザーの取得自体はアプリ固有の関数 (`getCurrentUser` など) で行います。
 *
 * @param request 現在のリクエストです。
 * @param options 動作を調整する設定です。
 * @returns ログインページへの `RedirectResponse` です。
 */
export function redirectToLogin(
  request: AuthGuardRequest,
  options?: RedirectToLoginOptions,
): RedirectResponse {
  const { pathname, search } = request.url;
  return redirect(loginUrlFor(pathname, search, options?.loginPath ?? "/login"));
}

/**
 * `requireRole` の動作を調整する設定です。
 */
export type RequireRoleOptions<TRole extends string = string> = {
  /**
   * 通過を許可するロールの集合です。
   */
  readonly roles: readonly TRole[];

  /**
   * 未認証時に誘導するログインページのパスです。
   *
   * @default "/login"
   */
  readonly loginPath?: string;

  /**
   * ロール不一致時に遷移させるパスです。
   *
   * @default "/"
   */
  readonly forbiddenPath?: string;
};

/**
 * ロールベースの認可を検査し、通過できないときの遷移先を作成します。
 *
 * 未認証のときはログインページ誘導を、ロール不一致のときは `forbiddenPath` への遷移を返します。どちらにも当てはまらないときは `null` を返すため、ローダーの先頭で早期リターンに使えます。認可の分岐を各ページに分散させず、レイアウトのローダー単層で使うことを推奨します。
 *
 * @param request 現在のリクエストです。
 * @param user 現在のユーザーです。アプリ固有の取得関数 (`getCurrentUser` など) で用意します。
 * @param options 許可ロールと遷移先の設定です。
 * @returns 遷移が必要なときの `RedirectResponse`、不要なときは `null` です。
 */
export function requireRole<TRole extends string>(
  request: AuthGuardRequest,
  user: { readonly role: TRole } | null | undefined,
  options: RequireRoleOptions<TRole>,
): RedirectResponse | null {
  if (!user) {
    // `exactOptionalPropertyTypes` のため、`undefined` の明示渡しを避けて分岐します。
    return options.loginPath === undefined
      ? redirectToLogin(request)
      : redirectToLogin(request, { loginPath: options.loginPath });
  }
  if (!options.roles.includes(user.role)) {
    return redirect(options.forbiddenPath ?? "/");
  }
  return null;
}

/**
 * 同一オリジンパスとしてそのまま使えるかを判定します。
 *
 * @param value 判定する値です。
 * @returns 安全な同一オリジンパスのときに `true` を返します。
 */
function isRawRedirectTarget(value: string): boolean {
  if (!hasSafeRedirectPrefix(value)) {
    return false;
  }
  // バックスラッシュや空白・制御文字はブラウザーの正規化で意味が変わるため、含む値は受け付けません。
  for (const char of value) {
    const code = char.charCodeAt(0);
    if (code <= 0x20 || code === 0x7f || code === 0x5c) {
      return false;
    }
  }
  return true;
}

/**
 * 値が `/` 1 文字で始まる同一オリジンの接頭辞を持つかを判定します。
 *
 * 2 文字目が `/` (`//evil.com` のようなプロトコル相対 URL) や `\` (`/\evil.com` のような正規化逃れ) のときは別オリジンに化ける可能性があるため `false` を返します。
 *
 * @param value 判定する値です。
 * @returns 安全な接頭辞を持つときに `true` を返します。
 */
function hasSafeRedirectPrefix(value: string): boolean {
  if (!value.startsWith("/")) {
    return false;
  }
  const second = value.charCodeAt(1);
  return second !== 0x2f && second !== 0x5c;
}

/**
 * パーセント符号化を最大 2 回まで復号します。
 *
 * 二重符号化 (`/%252f` など) による検査回避を検出するためのもので、復号できない値は途中の状態のまま返します。
 *
 * @param value 復号する値です。
 * @returns 復号後の値です。
 */
function decodeRedirectTarget(value: string): string {
  let decoded = value;
  for (let index = 0; index < 2; index += 1) {
    let next: string;
    try {
      next = decodeURIComponent(decoded);
    } catch {
      break;
    }
    if (next === decoded) {
      break;
    }
    decoded = next;
  }
  return decoded;
}

/**
 * URL 構文解析で除去されるタブと改行を取り除きます。
 *
 * WHATWG URL 構文解析はタブと改行を除去してから解釈するため、除去後の形で接頭辞を検査する必要があります。
 *
 * @param value 変換する値です。
 * @returns タブと改行を含まない値です。
 */
function stripUrlIgnoredChars(value: string): string {
  let normalized = "";
  for (const char of value) {
    if (char !== "\t" && char !== "\n" && char !== "\r") {
      normalized += char;
    }
  }
  return normalized;
}

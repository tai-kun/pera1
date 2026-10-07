import { describe, test } from "vitest";

import RedirectResponse from "../../src/core/redirect-response.js";
import {
  loginUrlFor,
  REDIRECT_TO_PARAM,
  redirectToLogin,
  requireRole,
  sanitizeRedirectTo,
} from "../../src/utils/auth-guard.js";

describe("sanitizeRedirectTo", () => {
  test("同一オリジンパスをそのまま返す", ({ expect }) => {
    // 実行
    const actual = sanitizeRedirectTo("/dashboard", "/");

    // 検証
    expect(actual).toBe("/dashboard");
  });

  test("クエリーとハッシュを保持する", ({ expect }) => {
    // 実行
    const actual = sanitizeRedirectTo("/projects?tab=tasks#sec", "/");

    // 検証
    expect(actual).toBe("/projects?tab=tasks#sec");
  });

  test("空や null のときはフォールバックを返す", ({ expect }) => {
    // 実行と検証
    expect(sanitizeRedirectTo(null, "/dashboard")).toBe("/dashboard");
    expect(sanitizeRedirectTo("", "/dashboard")).toBe("/dashboard");
    expect(sanitizeRedirectTo("   ", "/dashboard")).toBe("/dashboard");
  });

  test("フォールバック未指定のときはルートになる", ({ expect }) => {
    // 実行と検証
    expect(sanitizeRedirectTo(null)).toBe("/");
  });

  test("プロトコル相対 URL を弾く", ({ expect }) => {
    // 実行と検証
    expect(sanitizeRedirectTo("//evil.com", "/dashboard")).toBe("/dashboard");
    expect(sanitizeRedirectTo("///evil.com", "/dashboard")).toBe("/dashboard");
  });

  test("バックスラッシュ始まりを弾く", ({ expect }) => {
    // 実行と検証
    expect(sanitizeRedirectTo("/\\evil.com", "/dashboard")).toBe("/dashboard");
    expect(sanitizeRedirectTo("/\\/evil.com", "/dashboard")).toBe("/dashboard");
  });

  test("途中のバックスラッシュも弾く", ({ expect }) => {
    // 実行と検証
    expect(sanitizeRedirectTo("/ok\\evil.com", "/dashboard")).toBe("/dashboard");
  });

  test("符号化された // や /\\ を弾く", ({ expect }) => {
    // 実行と検証
    expect(sanitizeRedirectTo("/%2f%2fevil.com", "/dashboard")).toBe("/dashboard");
    expect(sanitizeRedirectTo("/%2F%2Fevil.com", "/dashboard")).toBe("/dashboard");
    expect(sanitizeRedirectTo("/%5cevil.com", "/dashboard")).toBe("/dashboard");
  });

  test("二重符号化された // を弾く", ({ expect }) => {
    // 実行と検証
    expect(sanitizeRedirectTo("/%252f%252fevil.com", "/dashboard")).toBe("/dashboard");
  });

  test("タブや改行の除去で // に化ける値を弾く", ({ expect }) => {
    // 実行と検証
    expect(sanitizeRedirectTo("/%09/%2fevil.com", "/dashboard")).toBe("/dashboard");
    expect(sanitizeRedirectTo("/%0a/%2fevil.com", "/dashboard")).toBe("/dashboard");
  });

  test("絶対 URL やスキーム付きを弾く", ({ expect }) => {
    // 実行と検証
    expect(sanitizeRedirectTo("https://evil.com", "/dashboard")).toBe("/dashboard");
    expect(sanitizeRedirectTo("javascript:alert(1)", "/dashboard")).toBe("/dashboard");
    expect(sanitizeRedirectTo("evil.com/phish", "/dashboard")).toBe("/dashboard");
  });

  test("空白や制御文字を含む値を弾く", ({ expect }) => {
    // 実行と検証
    expect(sanitizeRedirectTo("/with space", "/dashboard")).toBe("/dashboard");
    expect(sanitizeRedirectTo("/with\nnewline", "/dashboard")).toBe("/dashboard");
  });

  test("クエリー内の符号化は保持する", ({ expect }) => {
    // 実行
    const actual = sanitizeRedirectTo("/search?q=a%20b", "/");

    // 検証
    expect(actual).toBe("/search?q=a%20b");
  });

  test("壊れた符号化でも安全な接頭辞なら通す", ({ expect }) => {
    // 実行
    const actual = sanitizeRedirectTo("/100%-off", "/dashboard");

    // 検証
    expect(actual).toBe("/100%-off");
  });

  test("安全でないフォールバックはルートに倒す", ({ expect }) => {
    // 実行と検証
    expect(sanitizeRedirectTo("//evil.com", "//evil.com")).toBe("/");
  });
});

describe("loginUrlFor", () => {
  test("現在のパスを redirectTo に埋め込む", ({ expect }) => {
    // 実行
    const actual = loginUrlFor("/dashboard", "");

    // 検証
    expect(actual).toBe(`/login?${REDIRECT_TO_PARAM}=${encodeURIComponent("/dashboard")}`);
  });

  test("クエリーを引き継ぐ", ({ expect }) => {
    // 実行
    const actual = loginUrlFor("/app/projects", "?tab=tasks");

    // 検証
    expect(actual).toBe(
      `/login?${REDIRECT_TO_PARAM}=${encodeURIComponent("/app/projects?tab=tasks")}`,
    );
  });

  test("ログインパスを変更できる", ({ expect }) => {
    // 実行
    const actual = loginUrlFor("/dashboard", "", "/sign-in");

    // 検証
    expect(actual).toBe(`/sign-in?${REDIRECT_TO_PARAM}=${encodeURIComponent("/dashboard")}`);
  });
});

describe("redirectToLogin", () => {
  test("現在のパスを引き継いだ誘導レスポンスを返す", ({ expect }) => {
    // 準備
    const request = { url: { pathname: "/dashboard", search: "?tab=1" } };

    // 実行
    const response = redirectToLogin(request);

    // 検証
    expect(response).toBeInstanceOf(RedirectResponse);
    expect(response.pathname).toBe("/login");
    expect(response.search).toBe(`?${REDIRECT_TO_PARAM}=${encodeURIComponent("/dashboard?tab=1")}`);
  });

  test("ログインパスを変更できる", ({ expect }) => {
    // 準備
    const request = { url: { pathname: "/dashboard", search: "" } };

    // 実行
    const response = redirectToLogin(request, { loginPath: "/sign-in" });

    // 検証
    expect(response.pathname).toBe("/sign-in");
  });
});

describe("requireRole", () => {
  test("未認証のときはログインページ誘導を返す", ({ expect }) => {
    // 準備
    const request = { url: { pathname: "/admin", search: "" } };

    // 実行
    const response = requireRole(request, null, { roles: ["admin"] });

    // 検証
    expect(response).toBeInstanceOf(RedirectResponse);
    expect(response?.pathname).toBe("/login");
  });

  test("許可ロールなら null を返す", ({ expect }) => {
    // 準備
    const request = { url: { pathname: "/admin", search: "" } };

    // 実行
    const response = requireRole(
      request,
      { role: "admin" as const },
      { roles: ["admin" as const] },
    );

    // 検証
    expect(response).toBe(null);
  });

  test("ロール不一致のときは forbiddenPath に遷移させる", ({ expect }) => {
    // 準備
    const request = { url: { pathname: "/admin", search: "" } };

    // 実行
    const response = requireRole(
      request,
      { role: "user" as const },
      { roles: ["admin" as const], forbiddenPath: "/dashboard" },
    );

    // 検証
    expect(response).toBeInstanceOf(RedirectResponse);
    expect(response?.pathname).toBe("/dashboard");
  });

  test("forbiddenPath 未指定のときはルートになる", ({ expect }) => {
    // 準備
    const request = { url: { pathname: "/admin", search: "" } };

    // 実行
    const response = requireRole(request, { role: "user" as const }, { roles: ["admin" as const] });

    // 検証
    expect(response?.pathname).toBe("/");
  });
});

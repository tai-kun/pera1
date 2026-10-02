import RedirectResponse from "../core/redirect-response.js";

/**
 * 指定された URL パスへのリダイレクトを表すレスポンスオブジェクトを作成します。
 *
 * アクションの中で、別のページへ遷移させるために使用されます。
 *
 * @param destination リダイレクト先の URL パスです。
 * @returns 作成された `RedirectResponse` オブジェクトです。
 */
export default function redirect(destination: string): RedirectResponse {
  return new RedirectResponse(destination);
}

import RedirectResponse from "../core/redirect-response.js";

/**
 * 指定された URL パスへのリダイレクトを表すレスポンスオブジェクトを作成します。
 *
 * ローダーまたはアクションの中で、別のページへ遷移させるために使用します。
 * 返された `RedirectResponse` はエンジンが回収し、自動的に遷移先へ移動します。
 *
 * @param destination リダイレクト先の URL パスです。
 * @returns 作成された `RedirectResponse` オブジェクトです。
 */
export default function redirect(destination: string): RedirectResponse {
  return new RedirectResponse(destination);
}

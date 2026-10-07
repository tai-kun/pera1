import { NinjaPromise } from "ninja-promise";

import RedirectResponse from "./redirect-response.js";

/**
 * ローダーの実行結果から `RedirectResponse` を隠蔽するラッパーです。
 *
 * リダイレクト時は解決されない `NinjaPromise<never>` を返します。
 *
 * コンポーネントは遷移完了までサスペンスを維持し、`RedirectResponse` に触れません。
 *
 * @param raw 隠蔽前のローダー実行結果です。
 * @returns コンポーネント公開用のプロミスを返します。
 */
export default function hideLoaderRedirect(raw: NinjaPromise<unknown>): NinjaPromise<unknown> {
  if (raw.status === "fulfilled") {
    return raw.value instanceof RedirectResponse ? new NinjaPromise<never>(() => {}) : raw;
  }
  if (raw.status === "rejected") {
    return raw;
  }

  const resolvers = NinjaPromise.withResolvers<unknown>();
  void (async () => {
    try {
      const value = await raw;
      if (!(value instanceof RedirectResponse)) {
        resolvers.resolve(value);
      }
    } catch (ex) {
      resolvers.reject(ex);
    }
  })();
  return resolvers.promise;
}

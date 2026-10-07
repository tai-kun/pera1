import { NinjaPromise } from "ninja-promise";

import RedirectResponse from "./redirect-response.js";

/**
 * ローダーの実行結果から `RedirectResponse` を隠蔽するラッパーです。
 *
 * リダイレクト時は `null` で解決済みのプロミスを返します。
 *
 * コンポーネント側へ `RedirectResponse` を露出させません。
 *
 * @param raw 隠蔽前のローダー実行結果です。
 * @returns コンポーネント公開用のプロミスを返します。
 */
export default function hideLoaderRedirect(raw: NinjaPromise<unknown>): NinjaPromise<unknown> {
  if (raw.status === "fulfilled") {
    return raw.value instanceof RedirectResponse ? NinjaPromise.resolve(null) : raw;
  }
  if (raw.status === "rejected") {
    return raw;
  }
  const { promise, resolve, reject } = NinjaPromise.withResolvers<unknown>();
  void (async () => {
    try {
      const value = await raw;
      resolve(value instanceof RedirectResponse ? null : value);
    } catch (reason) {
      reject(reason);
    }
  })();
  return promise;
}

import { NinjaPromise } from "ninja-promise";

import RedirectResponse from "./redirect-response.js";

/**
 * ローダーの実行結果から `RedirectResponse` を隠蔽し、コンポーネント側へ露出させないためのラッパーです。
 *
 * 同期的にリダイレクトが確定した場合は永遠に解決しないプロミスを返します。
 *
 * 非同期の場合は元処理の解決を待ち受けます。
 *
 * リダイレクト時には解決させずにサスペンスを維持し、通常値のときのみ透過させます。
 *
 * 拒否時はそのまま透過させます。
 *
 * @param raw 隠蔽前のローダー実行結果です。
 * @returns コンポーネント公開用のプロミスを返します。
 */
export default function hideLoaderRedirect(
  raw: NinjaPromise<unknown>,
): NinjaPromise<unknown> {
  switch (raw.status) {
    case "fulfilled": {
      if (raw.value instanceof RedirectResponse) {
        return NinjaPromise.withResolvers<unknown>().promise;
      }

      return raw;
    }

    case "rejected": {
      return raw;
    }

    case "pending": {
      const { promise, resolve, reject } = NinjaPromise.withResolvers<unknown>();

      void (async () => {
        try {
          const value = await raw;

          if (value instanceof RedirectResponse) {
            return;
          }

          resolve(value);
        } catch (reason) {
          reject(reason);
        }
      })();

      return promise;
    }
  }
}

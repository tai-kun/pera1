import * as React from "react";

import useRouterContext from "./use-router-context.js";

/**
 * `Router` / `BrowserRouter` の `scrollRestoration` プロパティーと {@link useScrollRestoration|`useScrollRestoration`} フックで受け付ける値です。
 *
 * - `false` / `undefined`: 何もしません (既定のブラウザー任せ)。
 * - `true`: 遷移後に先頭へスクロールします (`behavior: "auto"`)。
 * - `ScrollBehavior` (`"auto"`、`"instant"`、`"smooth"`): 指定した振る舞いで先頭へスクロールします。
 */
export type ScrollRestorationOption = boolean | ScrollBehavior;

/**
 * 遷移後のスクロールをオプトインで先頭へ戻すためのカスタムフックです。
 *
 * 既定はブラウザー任せ (何もしない) です。
 * 有効化すると、履歴エントリー ID の変化 (実質的なページ遷移) のたびに `window.scrollTo({ top: 0, left: 0 })` を実行します。
 * `NavigationApiEngine` は `intercept()` に `scroll` / `focusReset` 指定を渡さず、ハッシュ変化・ダウンロード・リロードをスルーするため、有効化しない限りスクロールとフォーカスはブラウザーの標準動作のままです。
 *
 * ハッシュ付き URL (`#section`) の遷移ではブラウザーに任せて何もしません。
 * 初回マウントのときもディープリンクを壊さないよう何もしません。
 * 戻る・進むでの位置復元までは行いません。
 * 必要な場合は履歴ごとに位置を保存する自前の実装を検討してください。
 *
 * ```tsx
 * function App() {
 *   useScrollRestoration(true);
 *   return <Outlet />;
 * }
 * ```
 *
 * @param scrollRestoration 有効化フラグまたは `ScrollBehavior` です。
 * 省略・`false` では何もしません。
 */
export default function useScrollRestoration(scrollRestoration?: ScrollRestorationOption): void {
  // `useSyncExternalStore` の `getSnapshot` はキャッシュされた値を返す必要があるため、プリミティブな ID と href を別々に購読します (オブジェクト生成は無限ループの原因になります)。
  const entryId = useRouterContext(
    (router) =>
      (router as unknown as { currentEntry?: { id?: string } }).currentEntry?.id as
        | string
        | undefined,
  );
  const urlHref = useRouterContext(
    (router) =>
      (router as unknown as { currentEntry?: { url?: { href?: string } } }).currentEntry?.url
        ?.href as string | undefined,
  );

  // 初回マウントのときはディープリンク (`#...` 付きでの直接表示) を壊さないよう何もしません。
  const isFirstRender = React.useRef(true);

  React.useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (!scrollRestoration) {
      return;
    }
    if (typeof window === "undefined") {
      return;
    }
    // ハッシュ付き遷移はブラウザーに任せます (エンジンも `hashChange` をスルーします)。
    try {
      const href = urlHref ?? window.location.href;
      if (new URL(href).hash) {
        return;
      }
    } catch {
      // URL 解析に失敗してもスクロール自体は継続します。
    }
    const behavior: ScrollBehavior = scrollRestoration === true ? "auto" : scrollRestoration;
    window.scrollTo({ top: 0, left: 0, behavior });
  }, [entryId, scrollRestoration, urlHref]);
}

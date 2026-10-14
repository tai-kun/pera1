import * as React from "react";

/**
 * どのルートにもマッチしなかったときの 404 画面です。
 *
 * `useRoutePath` 自体は `RouterContext` しか必要としないため、`notFoundComponent`
 * からも呼べる場合があります。ただし、初回表示の未マッチでは表示すべき履歴エントリーが
 * まだ確定していないため、ここでは `window.location` から URL を読みます
 * (詳細は docs/guides/error-handling.mdx の 404 節を参照)。
 */
export default function NotFoundPage() {
  return (
    <section className="stack" data-testid="not-found-page">
      <h1 className="page-title">ページが見つかりません</h1>
      <p className="page-lead">指定された URL に一致するルートがありません。</p>
      <p className="muted">
        リクエストされたパス: <code data-testid="not-found-path">{window.location.pathname}</code>
      </p>
      <div className="cluster">
        <a className="button button-primary" href="/">
          ダッシュボードへ戻る
        </a>
      </div>
      <p className="muted">
        <span className="badge">開発者向け</span> ルーターの仕組みを試す場合は{" "}
        <a href="/lab">Lab を開く</a>
      </p>
    </section>
  );
}

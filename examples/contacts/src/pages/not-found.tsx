// 006: `notFoundComponent` (BrowserRouter の一次 API) として描画される 404 ページです。
// 未マッチ時に直接描画されるため、`/*` 時代の `outlet` 透過分岐は不要です。
// 明示的な `path: "/*"` 定義もレガシー手段として併存可能で、その場合は `/*` の通常マッチが優先されます。
export default function NotFoundPage() {
  return (
    <div>
      <h2>ページが見つかりません</h2>
      <p>
        <a href="/">ホームに戻る</a>
      </p>
    </div>
  );
}

import { Outlet, useNavigation } from "@pera1/react";
import * as React from "react";

/**
 * 遷移中の表示 (`useNavigation`) をヘッダー配下に置くための小さな表示部品です。
 *
 * `Suspense` のフォールバックと役割が異なります。フォールバックは遅延データの
 * 「穴埋め表示」、こちらはナビゲーション全体の「進行中表示」です。
 * `Suspense` の内側に置くとフォールバックに置き換えられて見えなくなるため、
 * 必ず `Suspense` の外側 (レイアウト側) に置いてください。
 */
function PendingBar() {
  const navigation = useNavigation();
  if (navigation.state === "idle") {
    return null;
  }
  return (
    <p role="status" aria-live="polite">
      {navigation.state === "submitting" ? "送信中…" : "読み込み中…"}
    </p>
  );
}

export default function RootLayout() {
  return (
    <>
      <header>
        <h1>
          <a href="/">ブログ</a>
        </h1>
        <nav>
          <a href="/">ホーム</a>
          {" | "}
          <a href="/posts">記事一覧</a>
          {" | "}
          <a href="/search">検索</a>
          {" | "}
          <a href="/about">このブログについて</a>
        </nav>
        <PendingBar />
      </header>
      <main>
        <React.Suspense fallback={<p>読み込み中…</p>}>
          <Outlet />
        </React.Suspense>
      </main>
    </>
  );
}

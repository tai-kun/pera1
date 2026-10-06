import { Outlet } from "@pera1/react";
import * as React from "react";

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
      </header>
      <main>
        <React.Suspense fallback={<p>読み込み中…</p>}>
          <Outlet />
        </React.Suspense>
      </main>
    </>
  );
}

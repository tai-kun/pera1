import { Outlet } from "@pera1/react";
import { Suspense } from "react";

export default function RootLayout() {
  return (
    <>
      <header>
        <h1>
          <a href="/">連絡先帳</a>
        </h1>
      </header>
      <main>
        <Suspense fallback={<p>読み込み中…</p>}>
          <Outlet />
        </Suspense>
      </main>
    </>
  );
}

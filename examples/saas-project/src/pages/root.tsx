import { Outlet } from "@pera1/react";
import * as React from "react";

export default function RootLayout() {
  return (
    <>
      <header>
        <h1>
          <a href="/">SaaS Project</a>
        </h1>
      </header>
      <main>
        <React.Suspense fallback={<p>読み込み中…</p>}>
          <Outlet />
        </React.Suspense>
      </main>
    </>
  );
}

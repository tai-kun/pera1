import { Outlet } from "@pera1/react";
import * as React from "react";

export default function RootLayout() {
  return (
    <>
      <header>
        <h1>
          <a href="/">Travel Booking</a>
        </h1>
        <nav aria-label="サイト">
          <a href="/">Home</a>
          {" | "}
          <a href="/travel">Travel</a>
          {" | "}
          <a href="/travel/search">Search</a>
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

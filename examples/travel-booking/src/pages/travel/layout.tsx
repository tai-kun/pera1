import { Outlet, redirect, useRoutePath } from "@pera1/react";

import RedirectTo from "../../components/redirect-to.js";

export async function loader() {
  return { ready: true as const };
}

export default function TravelLayout() {
  const { pathname } = useRoutePath();
  if (pathname === "/travel") {
    return <RedirectTo response={redirect("/travel/search")} />;
  }

  return (
    <section>
      <h2>旅行</h2>
      <nav aria-label="旅行">
        <a href="/travel/search">Search</a>
      </nav>
      <Outlet />
    </section>
  );
}

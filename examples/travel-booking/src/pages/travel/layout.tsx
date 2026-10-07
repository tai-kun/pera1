import { Outlet } from "@pera1/react";

export async function loader() {
  return { ready: true as const };
}

export default function TravelLayout() {
  // `/travel` 単体への遷移は子の index へ自動誘導されます。
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

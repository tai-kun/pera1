import { Outlet } from "@pera1/react";

export default function PostsLayout() {
  return (
    <section>
      <h2>ブログ記事</h2>
      <Outlet />
    </section>
  );
}

import {
  type LoaderFunctionArgs,
  Outlet,
  useLoaderData,
} from "@pera1/react";
import * as React from "react";

import { findUser } from "../../api/users.js";

export async function loader({ params }: LoaderFunctionArgs) {
  const username = params["username"];
  if (username === undefined) {
    throw new Error("username が指定されていません。");
  }

  return { username, user: await findUser(username) };
}

export default function ProfileLayout() {
  const { username, user } = React.use(useLoaderData<typeof loader>());

  if (!user) {
    return (
      <section>
        <h2>ユーザーが見つかりません</h2>
        <p>ID: {username} のユーザーは存在しません。</p>
        <p>
          <a href="/explore">ユーザーを探す</a>
        </p>
      </section>
    );
  }

  return (
    <section>
      <h2>{user.name}</h2>
      <p>@{user.username}</p>
      <p>{user.bio}</p>
      <nav aria-label="プロフィール">
        <a href={`/users/${user.username}/posts`}>Posts</a>
        {" | "}
        <a href={`/users/${user.username}/followers`}>Followers</a>
        {" | "}
        <a href={`/users/${user.username}/following`}>Following</a>
      </nav>
      <Outlet />
    </section>
  );
}

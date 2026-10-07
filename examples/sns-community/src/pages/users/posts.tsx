import {
  type LoaderFunctionArgs,
  useLoaderData,
} from "@pera1/react";
import * as React from "react";

import { listPostsByUser } from "../../api/posts.js";
import { findUser } from "../../api/users.js";

export async function loader({ params }: LoaderFunctionArgs) {
  const username = params["username"];
  if (username === undefined) {
    throw new Error("username が指定されていません。");
  }

  const user = await findUser(username);
  if (!user) {
    return { username, user: undefined, posts: [] as const };
  }

  return { username, user, posts: await listPostsByUser(username) };
}

export default function UserPostsPage() {
  const { username, user, posts } = React.use(useLoaderData<typeof loader>());

  if (!user) {
    return (
      <section>
        <h3>ユーザーが見つかりません</h3>
        <p>ID: {username} のユーザーは存在しません。</p>
      </section>
    );
  }

  return (
    <section>
      <h3>Posts</h3>
      {posts.length === 0 ? (
        <p>まだ投稿がありません。</p>
      ) : (
        <ul>
          {posts.map((post) => (
            <li key={post.id}>{post.body}</li>
          ))}
        </ul>
      )}
    </section>
  );
}

import { useLoaderData } from "@pera1/react";
import * as React from "react";

import { listPosts } from "../../api/posts.js";

export async function loader() {
  return listPosts();
}

export default function PostsPage() {
  const posts = React.use(useLoaderData<typeof loader>());

  return (
    <>
      <h3>記事一覧</h3>
      <ul>
        {posts.map((post) => (
          <li key={post.id}>
            <a href={`/posts/${post.id}`}>{post.title}</a>
            {" ("}
            <a href={`/categories/${post.category}`}>{post.category}</a>
            {")"}
          </li>
        ))}
      </ul>
    </>
  );
}

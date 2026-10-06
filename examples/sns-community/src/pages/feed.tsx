import { useLoaderData } from "@pera1/react";
import * as React from "react";

import { listFeed } from "../api/posts.js";

export async function loader() {
  return listFeed();
}

export default function FeedPage() {
  const posts = React.use(useLoaderData<typeof loader>());

  return (
    <section>
      <h2>Feed</h2>
      <ul>
        {posts.map((post) => (
          <li key={post.id}>
            <a href={`/users/${post.author}`}>{post.author}</a>
            {": "}
            <span>{post.body}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

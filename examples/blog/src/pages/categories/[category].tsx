import { type LoaderFunctionArgs, useLoaderData } from "@pera1/react";
import * as React from "react";

import { listPostsByCategory } from "../../api/posts.js";

export async function loader({ params }: LoaderFunctionArgs) {
  const category = params["category"];
  if (category === undefined) {
    throw new Error("category が指定されていません。");
  }
  return { category, posts: await listPostsByCategory(category) };
}

export default function CategoryPage() {
  const { category, posts } = React.use(useLoaderData<typeof loader>());

  return (
    <section>
      <h3>カテゴリ: {category}</h3>
      {posts.length === 0 ? (
        <p>このカテゴリには記事がありません。</p>
      ) : (
        <ul>
          {posts.map((post) => (
            <li key={post.id}>
              <a href={`/posts/${post.id}`}>{post.title}</a>
            </li>
          ))}
        </ul>
      )}
      <p>
        <a href="/posts">記事一覧に戻る</a>
      </p>
    </section>
  );
}

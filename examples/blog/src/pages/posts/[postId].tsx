import { type LoaderFunctionArgs, useLoaderData, useParams } from "@pera1/react";
import * as React from "react";

import { findPost } from "../../api/posts.js";

export async function loader({ params }: LoaderFunctionArgs) {
  const postId = params["postId"];
  if (postId === undefined) {
    throw new Error("postId が指定されていません。");
  }

  return findPost(postId);
}

export default function PostDetailPage() {
  const params = useParams<"/posts/:postId">();
  const post = React.use(useLoaderData<typeof loader>());

  if (!post) {
    return (
      <article>
        <h3>記事が見つかりません</h3>
        <p>ID: {params.postId} の記事は存在しません。</p>
        <p>
          <a href="/posts">Back to Posts</a>
        </p>
      </article>
    );
  }

  return (
    <article>
      <h3>{post.title}</h3>
      <p>
        カテゴリ: <a href={`/categories/${post.category}`}>{post.category}</a>
      </p>
      <p>{post.body}</p>
      <p>ID: {params.postId}</p>
      <p>
        <a href="/posts">Back to Posts</a>
      </p>
    </article>
  );
}

import {
  type LoaderFunctionArgs,
  useLoaderData,
  useNavigate,
} from "@pera1/react";
import * as React from "react";

import { searchPosts } from "../api/posts.js";

export async function loader({ request }: LoaderFunctionArgs) {
  const q = request.url.searchParams.get("q") ?? "";
  const page = Number(request.url.searchParams.get("page") ?? "1");
  return searchPosts(q, page);
}

export default function SearchPage() {
  const { q, page, total, totalPages, posts } = React.use(useLoaderData<typeof loader>());
  const navigate = useNavigate();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const nextQ = String(formData.get("q") ?? "");
    navigate(`/search?q=${encodeURIComponent(nextQ)}&page=1`);
  }

  const encodedQ = encodeURIComponent(q);

  return (
    <section>
      <h3>検索</h3>
      <form role="search" onSubmit={handleSubmit}>
        <label>
          キーワード
          <input name="q" defaultValue={q} />
        </label>
        <button type="submit">検索</button>
      </form>
      <p>
        キーワード「{q}」の検索結果: 全 {total} 件 (ページ {page} / {totalPages})
      </p>
      {posts.length === 0 ? (
        <p>検索結果がありません。</p>
      ) : (
        <ul>
          {posts.map((post) => (
            <li key={post.id}>
              <a href={`/posts/${post.id}`}>{post.title}</a>
            </li>
          ))}
        </ul>
      )}
      <nav>
        {page > 1 ? <a href={`/search?q=${encodedQ}&page=${page - 1}`}>前のページ</a> : null}
        {page > 1 && page < totalPages ? " | " : null}
        {page < totalPages ? <a href={`/search?q=${encodedQ}&page=${page + 1}`}>次のページ</a> : null}
      </nav>
    </section>
  );
}

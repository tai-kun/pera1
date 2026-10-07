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

  // 遷移後のフォーカス管理: 見出しに `tabIndex={-1}` を付けてプログラムから
  // フォーカス可能にし、検索条件 (`q` / `page`) が変わるたびに見出しへ移動します。
  // タブ遷移やページネーションではフォーカスが body に残ると
  // キーボード利用者が迷子になるため、この移動で現在位置を知らせます。
  // 初回表示ではフォーカスを奪わないよう何もしません。
  const headingRef = React.useRef<HTMLHeadingElement>(null);
  const isFirstRender = React.useRef(true);
  React.useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    headingRef.current?.focus();
  }, [q, page]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const nextQ = String(formData.get("q") ?? "");
    navigate(`/search?q=${encodeURIComponent(nextQ)}&page=1`);
  }

  const encodedQ = encodeURIComponent(q);

  return (
    <section aria-labelledby="search-heading">
      <h3 id="search-heading" ref={headingRef} tabIndex={-1}>
        検索
      </h3>
      <form role="search" onSubmit={handleSubmit}>
        <label>
          キーワード
          <input name="q" defaultValue={q} />
        </label>
        <button type="submit">検索</button>
      </form>
      <p aria-live="polite">
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
      <nav aria-label="検索結果のページ送り">
        {page > 1 ? <a href={`/search?q=${encodedQ}&page=${page - 1}`}>前のページ</a> : null}
        {page > 1 && page < totalPages ? " | " : null}
        {page < totalPages ? <a href={`/search?q=${encodedQ}&page=${page + 1}`}>次のページ</a> : null}
      </nav>
    </section>
  );
}

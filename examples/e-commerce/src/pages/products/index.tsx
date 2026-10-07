import { type LoaderFunctionArgs, useLoaderData, useNavigate } from "@pera1/react";
import * as React from "react";

import { listProducts } from "../../api/products.js";

function buildSearch(category: string, sort: string, page: number): string {
  const params = new URLSearchParams();
  if (category !== "") {
    params.set("category", category);
  }
  if (sort !== "") {
    params.set("sort", sort);
  }

  params.set("page", String(page));

  return `/products?${params.toString()}`;
}

export async function loader({ request }: LoaderFunctionArgs) {
  const category = request.url.searchParams.get("category") ?? "";
  const sort = request.url.searchParams.get("sort") ?? "";
  const page = Number(request.url.searchParams.get("page") ?? "1");

  return listProducts({ category, sort, page });
}

export default function ProductsPage() {
  const { category, sort, page, total, totalPages, products, categories } = React.use(
    useLoaderData<typeof loader>(),
  );
  const navigate = useNavigate();

  function handleCategoryChange(event: React.ChangeEvent<HTMLSelectElement>) {
    navigate(buildSearch(event.target.value, sort, 1));
  }

  function handleSortChange(event: React.ChangeEvent<HTMLSelectElement>) {
    navigate(buildSearch(category, event.target.value, 1));
  }

  return (
    <section>
      <h2>商品一覧</h2>
      <div>
        <label>
          カテゴリ
          <select value={category} onChange={handleCategoryChange}>
            <option value="">すべて</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>{" "}
        <label>
          ソート
          <select value={sort} onChange={handleSortChange}>
            <option value="">おすすめ</option>
            <option value="price">価格</option>
            <option value="name">名前</option>
          </select>
        </label>
      </div>
      <p>
        全 {total} 件 (ページ {page} / {totalPages})
      </p>
      {products.length === 0 ? (
        <p>商品がありません。</p>
      ) : (
        <ul>
          {products.map((product) => (
            <li key={product.id}>
              <a href={`/products/${product.id}`}>
                {product.name} - ¥{product.price}
              </a>{" "}
              ({product.category})
            </li>
          ))}
        </ul>
      )}
      <nav aria-label="ページネーション">
        {page > 1 ? <a href={buildSearch(category, sort, page - 1)}>前のページ</a> : null}
        {page > 1 && page < totalPages ? " | " : null}
        {page < totalPages ? <a href={buildSearch(category, sort, page + 1)}>次のページ</a> : null}
      </nav>
      <p>
        <a href="/cart">カートを見る</a>
      </p>
    </section>
  );
}

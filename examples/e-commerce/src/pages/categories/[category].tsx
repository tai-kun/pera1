import { type LoaderFunctionArgs, useLoaderData, useParams } from "@pera1/react";
import * as React from "react";

import { listProductsByCategory } from "../../api/products.js";

export async function loader({ params }: LoaderFunctionArgs) {
  const category = params["category"];
  if (category === undefined) {
    throw new Error("category が指定されていません。");
  }
  return { category, products: await listProductsByCategory(category) };
}

export default function CategoryPage() {
  const params = useParams<"/categories/:category">();
  const { category, products } = React.use(useLoaderData<typeof loader>());
  const displayCategory = category ?? params.category;

  return (
    <section>
      <h2>カテゴリ: {displayCategory}</h2>
      {products.length === 0 ? (
        <p>このカテゴリには商品がありません。</p>
      ) : (
        <ul>
          {products.map((product) => (
            <li key={product.id}>
              <a href={`/products/${product.id}`}>
                {product.name} - ¥{product.price}
              </a>
            </li>
          ))}
        </ul>
      )}
      <p>
        <a href="/products">商品一覧に戻る</a>
      </p>
    </section>
  );
}

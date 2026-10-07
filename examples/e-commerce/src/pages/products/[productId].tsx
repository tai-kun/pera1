import { type LoaderFunctionArgs, useLoaderData, useParams } from "@pera1/react";
import * as React from "react";

import { addToCart } from "../../api/cart.js";
import { findProduct, type Product } from "../../api/products.js";

export async function loader({ params }: LoaderFunctionArgs) {
  const productId = params["productId"];
  if (productId === undefined) {
    throw new Error("productId が指定されていません。");
  }

  return { product: await findProduct(productId) };
}

export default function ProductDetailPage() {
  const params = useParams<"/products/:productId">();
  const { product } = React.use(useLoaderData<typeof loader>());

  if (!product) {
    return (
      <article>
        <h2>商品が見つかりません</h2>
        <p>ID: {params.productId} の商品は存在しません。</p>
        <p>
          <a href="/products">商品一覧に戻る</a>
        </p>
      </article>
    );
  }

  return <ProductDetailView product={product} productId={params.productId} />;
}

function ProductDetailView({ product, productId }: { product: Product; productId: string }) {
  const [added, setAdded] = React.useState(false);

  async function handleAddToCart() {
    await addToCart(product.id, 1);
    setAdded(true);
  }

  return (
    <article>
      <h2>{product.name}</h2>
      <p>価格: ¥{product.price}</p>
      <p>
        カテゴリ: <a href={`/categories/${product.category}`}>{product.category}</a>
      </p>
      <p>{product.description}</p>
      <p>ID: {productId}</p>
      <p>
        <button type="button" onClick={handleAddToCart}>
          Add to Cart
        </button>
      </p>
      {added ? <p role="status">カートに追加しました。</p> : null}
      <p>
        <a href="/products">商品一覧に戻る</a>
        {" | "}
        <a href="/cart">Go to Cart</a>
      </p>
    </article>
  );
}

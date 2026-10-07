import { useLoaderData } from "@pera1/react";
import * as React from "react";

import { clearCart, listCart } from "../../api/cart.js";

export async function loader() {
  return listCart();
}

export default function CartPage() {
  const initial = React.use(useLoaderData<typeof loader>());

  return <CartView initial={initial} />;
}

function CartView({ initial }: { readonly initial: Awaited<ReturnType<typeof listCart>> }) {
  const [summary, setSummary] = React.useState(initial);
  const [cleared, setCleared] = React.useState(false);

  async function handleClear() {
    await clearCart();
    setSummary(await listCart());
    setCleared(true);
  }

  if (summary.lines.length === 0) {
    return (
      <section>
        <h2>カート</h2>
        <p>カートは空です。</p>
        {cleared ? <p role="status">カートを空にしました。</p> : null}
        <p>
          <a href="/products">商品一覧に戻る</a>
        </p>
      </section>
    );
  }

  return (
    <section>
      <h2>カート</h2>
      <ul>
        {summary.lines.map((line) => (
          <li key={line.product.id}>
            <a href={`/products/${line.product.id}`}>{line.product.name}</a> x {line.quantity} - ¥
            {line.product.price * line.quantity}
          </li>
        ))}
      </ul>
      <p>
        合計 {summary.count} 点: ¥{summary.total}
      </p>
      <p>
        <button type="button" onClick={handleClear}>
          Clear Cart
        </button>
      </p>
      <p>
        <a href="/checkout/shipping">Checkout</a>
      </p>
      <p>
        <a href="/products">商品一覧に戻る</a>
      </p>
    </section>
  );
}

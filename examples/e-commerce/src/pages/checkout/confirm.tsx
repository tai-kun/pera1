import {
  type LoaderFunctionArgs,
  redirect,
  useLoaderData,
  useNavigate,
} from "@pera1/react";
import * as React from "react";

import { isCartEmptySync, listCart } from "../../api/cart.js";
import { getPayment, getShipping } from "../../api/checkout.js";
import { createOrder } from "../../api/orders.js";

export async function loader(_args: LoaderFunctionArgs) {
  if (isCartEmptySync()) {
    return redirect("/cart");
  }
  const shipping = getShipping();
  if (!shipping) {
    return redirect("/checkout/shipping");
  }
  const payment = getPayment();
  if (!payment) {
    return redirect("/checkout/payment");
  }
  const cart = await listCart();
  return { cart, shipping, payment };
}

export default function ConfirmPage() {
  const data = React.use(useLoaderData<typeof loader>());
  const navigate = useNavigate();
  const [error, setError] = React.useState<string | null>(null);

  async function handleConfirm() {
    setError(null);
    try {
      const order = await createOrder();
      navigate(`/orders/${order.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "注文の作成に失敗しました。");
    }
  }

  return (
    <section>
      <h3>注文確認</h3>
      <ul>
        {data.cart.lines.map((line) => (
          <li key={line.product.id}>
            {line.product.name} x {line.quantity} - ¥{line.product.price * line.quantity}
          </li>
        ))}
      </ul>
      <p>
        合計: ¥{data.cart.total}
      </p>
      <p>
        配送先: {data.shipping.name} / {data.shipping.address} / {data.shipping.city} / {data.shipping.zip}
      </p>
      <p>
        支払: {data.payment.cardNumber} ({data.payment.expiry})
      </p>
      {error ? <p role="alert">{error}</p> : null}
      <p>
        <button type="button" onClick={handleConfirm}>
          Confirm Order
        </button>
      </p>
    </section>
  );
}

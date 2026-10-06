import { type LoaderFunctionArgs, useLoaderData, useParams } from "@pera1/react";
import * as React from "react";

import { findOrder } from "../../api/orders.js";

export async function loader({ params }: LoaderFunctionArgs) {
  const orderId = params["orderId"];
  if (orderId === undefined) {
    throw new Error("orderId が指定されていません。");
  }
  return { order: await findOrder(orderId) };
}

export default function OrderDetailPage() {
  const params = useParams<"/orders/:orderId">();
  const { order } = React.use(useLoaderData<typeof loader>());

  if (!order) {
    return (
      <article>
        <h2>注文が見つかりません</h2>
        <p>ID: {params.orderId} の注文は存在しません。</p>
        <p>
          <a href="/products">商品一覧に戻る</a>
        </p>
      </article>
    );
  }

  return (
    <article>
      <h2>注文詳細</h2>
      <p>注文ID: {order.id}</p>
      <ul>
        {order.items.map((item) => (
          <li key={item.productId}>
            {item.name} x {item.quantity} - ¥{item.price * item.quantity}
          </li>
        ))}
      </ul>
      <p>
        合計: ¥{order.total}
      </p>
      <p>
        配送先: {order.shipping.name} / {order.shipping.address}
      </p>
      <p>
        <a href="/products">商品一覧に戻る</a>
      </p>
    </article>
  );
}

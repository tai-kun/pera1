import { Outlet, redirect, useRoutePath } from "@pera1/react";

import { isCartEmptySync } from "../../api/cart.js";

export async function loader() {
  if (isCartEmptySync()) {
    return redirect("/cart");
  }

  return { ready: true as const };
}

export default function CheckoutLayout() {
  const { pathname } = useRoutePath();

  return (
    <section>
      <h2>チェックアウト</h2>
      <nav aria-label="チェックアウト">
        <a
          href="/checkout/shipping"
          aria-current={pathname === "/checkout/shipping" ? "page" : undefined}
        >
          Shipping
        </a>
        {" | "}
        <a
          href="/checkout/payment"
          aria-current={pathname === "/checkout/payment" ? "page" : undefined}
        >
          Payment
        </a>
        {" | "}
        <a
          href="/checkout/confirm"
          aria-current={pathname === "/checkout/confirm" ? "page" : undefined}
        >
          Confirm
        </a>
      </nav>
      <Outlet />
    </section>
  );
}

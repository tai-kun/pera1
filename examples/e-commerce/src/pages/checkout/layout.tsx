import {
  type LoaderFunctionArgs,
  Outlet,
  RedirectResponse,
  redirect,
  useLoaderData,
  useRoutePath,
} from "@pera1/react";
import * as React from "react";

import { isCartEmptySync } from "../../api/cart.js";
import RedirectTo from "../../components/redirect-to.js";

export async function loader(_args: LoaderFunctionArgs) {
  if (isCartEmptySync()) {
    return redirect("/cart");
  }
  return { ready: true as const };
}

export default function CheckoutLayout() {
  const { pathname } = useRoutePath();
  const data = React.use(useLoaderData<typeof loader>());
  if (data instanceof RedirectResponse) {
    // loader の `redirect()` はエンジンが自動遷移させるため、ここでは何も描画しない。
    return null;
  }
  if (pathname === "/checkout") {
    return <RedirectTo response={redirect("/checkout/shipping")} />;
  }

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

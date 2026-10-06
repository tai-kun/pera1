import {
  type LoaderFunctionArgs,
  RedirectResponse,
  redirect,
  useLoaderData,
  useNavigate,
} from "@pera1/react";
import * as React from "react";

import { isCartEmptySync, listCart } from "../../api/cart.js";
import { getPayment, getShipping, setPayment } from "../../api/checkout.js";
import RedirectTo from "../../components/redirect-to.js";

export async function loader(_args: LoaderFunctionArgs) {
  if (isCartEmptySync()) {
    return redirect("/cart");
  }
  if (!getShipping()) {
    return redirect("/checkout/shipping");
  }
  const cart = await listCart();
  return { cart, payment: getPayment() };
}

export default function PaymentPage() {
  const data = React.use(useLoaderData<typeof loader>());
  const navigate = useNavigate();

  if (data instanceof RedirectResponse) {
    return <RedirectTo response={data} />;
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const cardNumber = String(formData.get("cardNumber") ?? "").trim();
    const expiry = String(formData.get("expiry") ?? "").trim();
    const cvc = String(formData.get("cvc") ?? "").trim();
    if (cardNumber === "" || expiry === "" || cvc === "") {
      return;
    }
    setPayment({ cardNumber, expiry, cvc });
    navigate("/checkout/confirm");
  }

  return (
    <section>
      <h3>支払情報</h3>
      <form onSubmit={handleSubmit}>
        <p>
          <label>
            Card Number
            <input name="cardNumber" inputMode="numeric" defaultValue={data.payment?.cardNumber ?? ""} />
          </label>
        </p>
        <p>
          <label>
            Expiry
            <input name="expiry" placeholder="12/30" defaultValue={data.payment?.expiry ?? ""} />
          </label>
        </p>
        <p>
          <label>
            CVC
            <input name="cvc" inputMode="numeric" defaultValue={data.payment?.cvc ?? ""} />
          </label>
        </p>
        <button type="submit">Next</button>
      </form>
    </section>
  );
}

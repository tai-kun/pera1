import {
  type LoaderFunctionArgs,
  redirect,
  useLoaderData,
  useNavigate,
} from "@pera1/react";
import * as React from "react";

import { isCartEmptySync, listCart } from "../../api/cart.js";
import { getShipping, setShipping } from "../../api/checkout.js";

export async function loader(_args: LoaderFunctionArgs) {
  if (isCartEmptySync()) {
    return redirect("/cart");
  }
  const cart = await listCart();
  return { cart, shipping: getShipping() };
}

export default function ShippingPage() {
  const data = React.use(useLoaderData<typeof loader>());
  if (data === null) {
    return null;
  }

  const navigate = useNavigate();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const name = String(formData.get("name") ?? "").trim();
    const address = String(formData.get("address") ?? "").trim();
    const city = String(formData.get("city") ?? "").trim();
    const zip = String(formData.get("zip") ?? "").trim();
    if (name === "" || address === "" || city === "" || zip === "") {
      return;
    }
    setShipping({ name, address, city, zip });
    navigate("/checkout/payment");
  }

  return (
    <section>
      <h3>配送先</h3>
      <form onSubmit={handleSubmit}>
        <p>
          <label>
            Name
            <input name="name" autoComplete="name" defaultValue={data.shipping?.name ?? ""} />
          </label>
        </p>
        <p>
          <label>
            Address
            <input name="address" autoComplete="street-address" defaultValue={data.shipping?.address ?? ""} />
          </label>
        </p>
        <p>
          <label>
            City
            <input name="city" autoComplete="address-level2" defaultValue={data.shipping?.city ?? ""} />
          </label>
        </p>
        <p>
          <label>
            ZIP Code
            <input name="zip" autoComplete="postal-code" defaultValue={data.shipping?.zip ?? ""} />
          </label>
        </p>
        <button type="submit">Next</button>
      </form>
    </section>
  );
}

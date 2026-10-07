import {
  type LoaderFunctionArgs,
  redirect,
  useLoaderData,
  useNavigate,
  useParams,
} from "@pera1/react";
import * as React from "react";

import { findBooking, getPassengers, getPayment, setPayment } from "../../api/bookings.js";

export async function loader({ params }: LoaderFunctionArgs) {
  const bookingId = params["bookingId"];
  if (bookingId === undefined) {
    throw new Error("bookingId が指定されていません。");
  }
  const booking = await findBooking(bookingId);
  if (!booking) {
    return { bookingId, booking: null, payment: null };
  }
  if (!getPassengers(bookingId)) {
    return redirect(`/travel/booking/${bookingId}/passengers`);
  }
  return { bookingId, booking, payment: getPayment(bookingId) };
}

export default function PaymentPage() {
  const params = useParams<"/travel/booking/:bookingId/payment">();
  const data = React.use(useLoaderData<typeof loader>());
  const navigate = useNavigate();

  if (data.booking === null) {
    return (
      <section>
        <h3>予約が見つかりません</h3>
        <p>ID: {data.bookingId ?? params.bookingId} の予約は存在しません。</p>
        <p>
          <a href="/travel/search">検索に戻る</a>
        </p>
      </section>
    );
  }

  const bookingId = data.booking.id;
  const payment = data.payment;

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const cardNumber = String(formData.get("cardNumber") ?? "").trim();
    const expiry = String(formData.get("expiry") ?? "").trim();
    const cvc = String(formData.get("cvc") ?? "").trim();
    if (cardNumber === "" || expiry === "" || cvc === "") {
      return;
    }
    setPayment(bookingId, { cardNumber, expiry, cvc });
    navigate(`/travel/booking/${bookingId}/confirm`);
  }

  return (
    <section>
      <h3>支払情報</h3>
      <form onSubmit={handleSubmit}>
        <p>
          <label>
            Card Number
            <input name="cardNumber" inputMode="numeric" defaultValue={payment?.cardNumber ?? ""} />
          </label>
        </p>
        <p>
          <label>
            Expiry
            <input name="expiry" placeholder="12/30" defaultValue={payment?.expiry ?? ""} />
          </label>
        </p>
        <p>
          <label>
            CVC
            <input name="cvc" inputMode="numeric" defaultValue={payment?.cvc ?? ""} />
          </label>
        </p>
        <button type="submit">Next</button>
      </form>
      <p>
        <a href={`/travel/booking/${bookingId}/passengers`}>Back</a>
      </p>
    </section>
  );
}

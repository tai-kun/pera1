import {
  type LoaderFunctionArgs,
  redirect,
  useLoaderData,
  useNavigate,
} from "@pera1/react";
import * as React from "react";

import { confirmBooking, findBooking, getPassengers, getPayment } from "../../api/bookings.js";

export async function loader({ params }: LoaderFunctionArgs) {
  const bookingId = params["bookingId"];
  if (bookingId === undefined) {
    throw new Error("bookingId が指定されていません。");
  }
  const booking = await findBooking(bookingId);
  if (!booking) {
    return { bookingId, booking: null, passengers: null, payment: null };
  }
  const passengers = getPassengers(bookingId);
  if (!passengers) {
    return redirect(`/travel/booking/${bookingId}/passengers`);
  }
  const payment = getPayment(bookingId);
  if (!payment) {
    return redirect(`/travel/booking/${bookingId}/payment`);
  }
  return { bookingId, booking, passengers, payment };
}

export default function ConfirmPage() {
  const data = React.use(useLoaderData<typeof loader>());
  const navigate = useNavigate();
  const [error, setError] = React.useState<string | null>(null);

  if (data.booking === null) {
    return (
      <section>
        <h3>予約が見つかりません</h3>
        <p>ID: {data.bookingId} の予約は存在しません。</p>
        <p>
          <a href="/travel/search">検索に戻る</a>
        </p>
      </section>
    );
  }

  const bookingId = data.booking.id;
  const booking = data.booking;
  const passengers = data.passengers;
  const payment = data.payment;

  async function handleConfirm() {
    setError(null);
    try {
      const confirmed = await confirmBooking(bookingId);
      navigate(`/travel/booking/${confirmed.id}/complete`);
    } catch (ex) {
      setError(ex instanceof Error ? ex.message : "予約の確定に失敗しました。");
    }
  }

  return (
    <section>
      <h3>予約確認</h3>
      <p>予約 ID: {booking.id}</p>
      <p>
        便: {booking.flight.airline} {booking.flight.id} ({booking.flight.depart} →{" "}
        {booking.flight.arrive}) - ¥{booking.flight.price}
      </p>
      <p>
        搭乗者: {passengers.name} / {passengers.email}
      </p>
      <p>
        支払: {payment.cardNumber} ({payment.expiry})
      </p>
      {error ? <p role="alert">{error}</p> : null}
      <p>
        <button type="button" onClick={() => void handleConfirm()}>
          Confirm Booking
        </button>
      </p>
      <p>
        <a href={`/travel/booking/${bookingId}/payment`}>Back</a>
      </p>
    </section>
  );
}

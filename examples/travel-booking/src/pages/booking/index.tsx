import {
  type LoaderFunctionArgs,
  useLoaderData,
  useParams,
} from "@pera1/react";
import * as React from "react";

import { findBooking } from "../../api/bookings.js";

export async function loader({ params }: LoaderFunctionArgs) {
  const bookingId = params["bookingId"];
  if (bookingId === undefined) {
    throw new Error("bookingId が指定されていません。");
  }
  return { bookingId, booking: await findBooking(bookingId) };
}

export default function BookingPage() {
  const params = useParams<"/travel/booking/:bookingId">();
  const { bookingId, booking } = React.use(useLoaderData<typeof loader>());
  const displayId = booking?.id ?? bookingId ?? params.bookingId;

  if (!booking) {
    return (
      <section>
        <h3>予約が見つかりません</h3>
        <p>ID: {displayId} の予約は存在しません。</p>
        <p>
          <a href="/travel/search">検索に戻る</a>
        </p>
      </section>
    );
  }

  return (
    <section>
      <h3>予約概要</h3>
      <p>予約ID: {booking.id}</p>
      <p>
        区間: {booking.from} → {booking.to} / {booking.date} / {booking.adults}名
      </p>
      <p>
        便: {booking.flight.airline} {booking.flight.id} ({booking.flight.depart} →{" "}
        {booking.flight.arrive}) - ¥{booking.flight.price}
      </p>
      <p>状態: {booking.status}</p>
      <p>
        <a href={`/travel/booking/${booking.id}/passengers`}>Next</a>
      </p>
    </section>
  );
}

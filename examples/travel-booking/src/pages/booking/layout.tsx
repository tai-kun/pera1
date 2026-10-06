import {
  type LoaderFunctionArgs,
  type ShouldReloadFunctionArgs,
  Outlet,
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

export function shouldReload(args: ShouldReloadFunctionArgs) {
  if (args.defaultShouldReload) {
    return true;
  }
  return args.currentParams["bookingId"] !== args.prevParams["bookingId"];
}

export default function BookingLayout() {
  const params = useParams<"/travel/booking/:bookingId">();
  const { bookingId, booking } = React.use(useLoaderData<typeof loader>());
  const displayId = booking?.id ?? bookingId ?? params.bookingId;

  if (!booking) {
    return (
      <section>
        <h2>予約が見つかりません</h2>
        <p>ID: {displayId} の予約は存在しません。</p>
        <p>
          <a href="/travel/search">検索に戻る</a>
        </p>
      </section>
    );
  }

  return (
    <section>
      <h2>予約 {booking.id}</h2>
      <nav aria-label="予約ステップ">
        <a href={`/travel/booking/${booking.id}`}>Booking</a>
        {" | "}
        <a href={`/travel/booking/${booking.id}/passengers`}>Passengers</a>
        {" | "}
        <a href={`/travel/booking/${booking.id}/payment`}>Payment</a>
        {" | "}
        <a href={`/travel/booking/${booking.id}/confirm`}>Confirm</a>
        {" | "}
        <a href={`/travel/booking/${booking.id}/complete`}>Complete</a>
      </nav>
      <Outlet />
    </section>
  );
}

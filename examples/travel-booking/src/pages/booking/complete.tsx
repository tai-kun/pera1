import {
  type LoaderFunctionArgs,
  type ShouldReloadFunctionArgs,
  RedirectResponse,
  redirect,
  useLoaderData,
  useParams,
} from "@pera1/react";
import * as React from "react";

import { findBooking, getPassengers, getPayment } from "../../api/bookings.js";
import RedirectTo from "../../components/redirect-to.js";

export async function loader({ params }: LoaderFunctionArgs) {
  const bookingId = params["bookingId"];
  if (bookingId === undefined) {
    throw new Error("bookingId が指定されていません。");
  }
  const booking = await findBooking(bookingId);
  if (!booking) {
    return { bookingId, booking: null };
  }
  if (!getPassengers(bookingId)) {
    return redirect(`/travel/booking/${bookingId}/passengers`);
  }
  if (!getPayment(bookingId)) {
    return redirect(`/travel/booking/${bookingId}/payment`);
  }
  if (booking.status !== "confirmed") {
    return redirect(`/travel/booking/${bookingId}/confirm`);
  }
  return { bookingId, booking };
}

export function shouldReload(args: ShouldReloadFunctionArgs) {
  if (args.defaultShouldReload) {
    return true;
  }
  return args.currentParams["bookingId"] !== args.prevParams["bookingId"];
}

export default function CompletePage() {
  const params = useParams<"/travel/booking/:bookingId/complete">();
  const data = React.use(useLoaderData<typeof loader>());

  if (data instanceof RedirectResponse) {
    return <RedirectTo response={data} />;
  }

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

  const booking = data.booking;

  return (
    <section>
      <h3>予約完了</h3>
      <p>予約ID: {booking.id}</p>
      <p>
        便: {booking.flight.airline} {booking.flight.id} ({booking.flight.depart} →{" "}
        {booking.flight.arrive})
      </p>
      <p>ご予約ありがとうございます。</p>
      <p>
        <a href="/travel/search">新しい検索へ</a>
      </p>
      <p>
        <a href="/">ホームに戻る</a>
      </p>
    </section>
  );
}

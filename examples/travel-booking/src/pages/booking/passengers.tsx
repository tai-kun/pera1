import {
  type LoaderFunctionArgs,
  useLoaderData,
  useNavigate,
} from "@pera1/react";
import * as React from "react";

import { findBooking, getPassengers, setPassengers } from "../../api/bookings.js";

export async function loader({ params }: LoaderFunctionArgs) {
  const bookingId = params["bookingId"];
  if (bookingId === undefined) {
    throw new Error("bookingId が指定されていません。");
  }

  const booking = await findBooking(bookingId);
  if (!booking) {
    return { bookingId, booking: null, passenger: null };
  }

  return { bookingId, booking, passenger: getPassengers(bookingId) };
}

export default function PassengersPage() {
  const data = React.use(useLoaderData<typeof loader>());
  const navigate = useNavigate();

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
  const passenger = data.passenger;

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const name = String(formData.get("name") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim();
    if (name === "" || email === "") {
      return;
    }

    setPassengers(bookingId, { name, email });
    navigate(`/travel/booking/${bookingId}/payment`);
  }

  return (
    <section>
      <h3>搭乗者情報</h3>
      <form onSubmit={handleSubmit}>
        <p>
          <label>
            Name
            <input name="name" autoComplete="name" defaultValue={passenger?.name ?? ""} />
          </label>
        </p>
        <p>
          <label>
            Email
            <input name="email" type="email" autoComplete="email" defaultValue={passenger?.email ?? ""} />
          </label>
        </p>
        <button type="submit">Next</button>
      </form>
      <p>
        <a href={`/travel/booking/${bookingId}`}>Back</a>
      </p>
    </section>
  );
}

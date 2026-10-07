import { type LoaderFunctionArgs, useLoaderData, useNavigate } from "@pera1/react";
import * as React from "react";

import { createBooking } from "../../api/bookings.js";
import { searchFlights } from "../../api/flights.js";

export async function loader({ request }: LoaderFunctionArgs) {
  const from = request.url.searchParams.get("from") ?? "";
  const to = request.url.searchParams.get("to") ?? "";
  const date = request.url.searchParams.get("date") ?? "";
  const adultsParam = request.url.searchParams.get("adults") ?? "";
  const adults = Number(adultsParam !== "" ? adultsParam : "1");
  const flights = await searchFlights({ from, to, date });

  return {
    from,
    to,
    date,
    adults: Number.isInteger(adults) && adults > 0 ? adults : 1,
    adultsParam,
    flights,
  };
}

export default function ResultsPage() {
  const { from, to, date, adults, adultsParam, flights } = React.use(useLoaderData<typeof loader>());
  const navigate = useNavigate();
  const [error, setError] = React.useState<string | null>(null);

  async function handleSelect(flightId: string) {
    setError(null);
    try {
      const booking = await createBooking({ from, to, date, adults, flightId });
      navigate(`/travel/booking/${booking.id}`);
    } catch (ex) {
      setError(ex instanceof Error ? ex.message : "予約の作成に失敗しました。");
    }
  }

  const params = new URLSearchParams();
  if (from !== "") {
    params.set("from", from);
  }
  if (to !== "") {
    params.set("to", to);
  }
  if (date !== "") {
    params.set("date", date);
  }
  if (adultsParam !== "") {
    params.set("adults", adultsParam);
  }

  const backSearch = params.toString() === "" ? "/travel/search" : `/travel/search?${params.toString()}`;

  return (
    <section>
      <h3>検索結果</h3>
      <p>
        条件: {from !== "" ? from : "-"} → {to !== "" ? to : "-"} / {date !== "" ? date : "-"} / {adults}
        名
      </p>
      {error ? <p role="alert">{error}</p> : null}
      {flights.length === 0 ? (
        <p>条件に合う便がありません。</p>
      ) : (
        <ul>
          {flights.map((flight) => (
            <li key={flight.id}>
              {flight.airline} {flight.id}: {flight.from} ({flight.depart}) → {flight.to} (
              {flight.arrive}) - ¥{flight.price}{" "}
              <button type="button" onClick={() => void handleSelect(flight.id)}>
                Select {flight.id}
              </button>
            </li>
          ))}
        </ul>
      )}
      <p>
        <a href={backSearch}>Back to Search</a>
      </p>
    </section>
  );
}

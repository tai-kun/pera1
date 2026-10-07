import { type LoaderFunctionArgs, useLoaderData, useNavigate } from "@pera1/react";
import * as React from "react";

export async function loader({ request }: LoaderFunctionArgs) {
  const from = request.url.searchParams.get("from") ?? "";
  const to = request.url.searchParams.get("to") ?? "";
  const date = request.url.searchParams.get("date") ?? "";
  const adults = request.url.searchParams.get("adults") ?? "";

  return { from, to, date, adults };
}

export default function SearchPage() {
  const { from, to, date, adults } = React.use(useLoaderData<typeof loader>());
  const navigate = useNavigate();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const nextFrom = String(formData.get("from") ?? "").trim();
    const nextTo = String(formData.get("to") ?? "").trim();
    const nextDate = String(formData.get("date") ?? "").trim();
    const nextAdults = String(formData.get("adults") ?? "").trim();
    const params = new URLSearchParams();
    if (nextFrom !== "") {
      params.set("from", nextFrom);
    }
    if (nextTo !== "") {
      params.set("to", nextTo);
    }
    if (nextDate !== "") {
      params.set("date", nextDate);
    }
    if (nextAdults !== "") {
      params.set("adults", nextAdults);
    }
    const query = params.toString();
    navigate(query === "" ? "/travel/search/results" : `/travel/search/results?${query}`);
  }

  return (
    <section>
      <h3>旅行検索</h3>
      <form onSubmit={handleSubmit}>
        <p>
          <label>
            From
            <input name="from" defaultValue={from} placeholder="TYO" />
          </label>
        </p>
        <p>
          <label>
            To
            <input name="to" defaultValue={to} placeholder="OSA" />
          </label>
        </p>
        <p>
          <label>
            Date
            <input name="date" type="date" defaultValue={date} />
          </label>
        </p>
        <p>
          <label>
            Adults
            <input name="adults" inputMode="numeric" defaultValue={adults} placeholder="2" />
          </label>
        </p>
        <button type="submit">Search</button>
      </form>
    </section>
  );
}

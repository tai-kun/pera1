export type Flight = {
  readonly id: string;
  readonly from: string;
  readonly to: string;
  readonly date: string;
  readonly depart: string;
  readonly arrive: string;
  readonly airline: string;
  readonly price: number;
};

const FLIGHTS: readonly Flight[] = [
  {
    id: "JL101",
    from: "TYO",
    to: "OSA",
    date: "2026-10-10",
    depart: "08:00",
    arrive: "09:15",
    airline: "JAL",
    price: 12800,
  },
  {
    id: "NH103",
    from: "TYO",
    to: "OSA",
    date: "2026-10-10",
    depart: "12:30",
    arrive: "13:45",
    airline: "ANA",
    price: 13500,
  },
  {
    id: "MM105",
    from: "TYO",
    to: "OSA",
    date: "2026-10-10",
    depart: "18:20",
    arrive: "19:40",
    airline: "Peach",
    price: 8900,
  },
  {
    id: "JL202",
    from: "OSA",
    to: "TYO",
    date: "2026-10-10",
    depart: "09:00",
    arrive: "10:10",
    airline: "JAL",
    price: 12900,
  },
  {
    id: "NH204",
    from: "OSA",
    to: "TYO",
    date: "2026-10-10",
    depart: "17:00",
    arrive: "18:10",
    airline: "ANA",
    price: 13200,
  },
  {
    id: "JL301",
    from: "TYO",
    to: "SPK",
    date: "2026-10-10",
    depart: "07:30",
    arrive: "09:05",
    airline: "JAL",
    price: 15800,
  },
  {
    id: "NH303",
    from: "TYO",
    to: "SPK",
    date: "2026-10-10",
    depart: "15:00",
    arrive: "16:35",
    airline: "ANA",
    price: 16200,
  },
  {
    id: "NH401",
    from: "SPK",
    to: "TYO",
    date: "2026-10-10",
    depart: "10:00",
    arrive: "11:40",
    airline: "ANA",
    price: 15900,
  },
];

export type FlightSearchQuery = {
  readonly from: string;
  readonly to: string;
  readonly date: string;
};

export async function searchFlights(query: FlightSearchQuery): Promise<Flight[]> {
  const from = query.from.trim().toUpperCase();
  const to = query.to.trim().toUpperCase();
  const date = query.date.trim();
  const matched = FLIGHTS.filter((flight) => {
    if (from !== "" && flight.from !== from) {
      return false;
    }
    if (to !== "" && flight.to !== to) {
      return false;
    }
    return true;
  });
  // 日付は表示用にリクエスト値で上書きします。条件に合わない区間は空配列になります。
  if (date !== "") {
    return matched.map((flight) => ({ ...flight, date }));
  }
  return [...matched];
}

export async function findFlight(flightId: string): Promise<Flight | undefined> {
  return FLIGHTS.find((flight) => flight.id === flightId);
}

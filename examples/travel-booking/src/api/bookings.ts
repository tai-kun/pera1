import { findFlight, type Flight } from "./flights.js";

export type Passenger = {
  readonly name: string;
  readonly email: string;
};

export type PaymentInfo = {
  readonly cardNumber: string;
  readonly expiry: string;
  readonly cvc: string;
};

export type BookingStatus = "draft" | "confirmed";

export type Booking = {
  readonly id: string;
  readonly from: string;
  readonly to: string;
  readonly date: string;
  readonly adults: number;
  readonly flight: Flight;
  readonly passengers: Passenger | null;
  readonly payment: PaymentInfo | null;
  readonly status: BookingStatus;
  readonly createdAt: string;
};

type StoredBooking = {
  readonly id: string;
  readonly from: string;
  readonly to: string;
  readonly date: string;
  readonly adults: number;
  readonly flight: Flight;
  readonly passengers: Passenger | null;
  readonly payment: PaymentInfo | null;
  readonly status: BookingStatus;
  readonly createdAt: string;
};

const STORAGE_KEY = "pera1-travel-booking:bookings";
const COUNTER_KEY = "pera1-travel-booking:booking-counter";

const bookings = new Map<string, StoredBooking>();

let nextId = 1;
let initialized = false;

function ensureInitialized(): void {
  if (initialized) {
    return;
  }

  initialized = true;
  try {
    const counterRaw = localStorage.getItem(COUNTER_KEY);
    if (counterRaw) {
      const parsed = Number(counterRaw);
      if (Number.isInteger(parsed) && parsed >= 1) {
        nextId = parsed;
      }
    }

    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return;
    }

    const parsed = JSON.parse(raw) as Array<Partial<StoredBooking>>;
    if (!Array.isArray(parsed)) {
      return;
    }

    for (const entry of parsed) {
      if (typeof entry.id === "string" && entry.flight && typeof entry.flight.id === "string") {
        bookings.set(entry.id, entry as StoredBooking);
        const numeric = Number(entry.id.replace("booking-", ""));
        if (Number.isInteger(numeric) && numeric >= nextId) {
          nextId = numeric + 1;
        }
      }
    }
  } catch {
    // 読み込みに失敗しても空として扱います。
  }
}

function persist(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...bookings.values()]));
    localStorage.setItem(COUNTER_KEY, String(nextId));
  } catch {
    // 保存に失敗しても無視します。
  }
}

function isValidPassenger(value: unknown): value is Passenger {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const v = value as Record<string, unknown>;

  return typeof v["name"] === "string" && v["name"] !== "" && typeof v["email"] === "string" && v["email"] !== "";
}

function isValidPayment(value: unknown): value is PaymentInfo {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const v = value as Record<string, unknown>;

  return (
    typeof v["cardNumber"] === "string" &&
    v["cardNumber"] !== "" &&
    typeof v["expiry"] === "string" &&
    v["expiry"] !== "" &&
    typeof v["cvc"] === "string" &&
    v["cvc"] !== ""
  );
}

export async function createBooking(input: {
  readonly from: string;
  readonly to: string;
  readonly date: string;
  readonly adults: number;
  readonly flightId: string;
}): Promise<Booking> {
  ensureInitialized();
  const flight = await findFlight(input.flightId);
  if (!flight) {
    throw new Error("便が見つかりません。");
  }

  const id = `booking-${nextId++}`;
  const booking: StoredBooking = {
    id,
    from: input.from,
    to: input.to,
    date: input.date,
    adults: input.adults,
    flight: { ...flight, date: input.date !== "" ? input.date : flight.date },
    passengers: null,
    payment: null,
    status: "draft",
    createdAt: new Date().toISOString(),
  };
  bookings.set(id, booking);
  persist();

  return booking;
}

export async function findBooking(id: string): Promise<Booking | undefined> {
  ensureInitialized();

  return bookings.get(id);
}

export function getPassengers(bookingId: string): Passenger | null {
  ensureInitialized();
  const booking = bookings.get(bookingId);
  if (!booking) {
    return null;
  }

  return isValidPassenger(booking.passengers) ? booking.passengers : null;
}

export function setPassengers(bookingId: string, passenger: Passenger): void {
  ensureInitialized();
  const booking = bookings.get(bookingId);
  if (!booking) {
    throw new Error("予約が見つかりません。");
  }

  bookings.set(bookingId, { ...booking, passengers: passenger });
  persist();
}

export function getPayment(bookingId: string): PaymentInfo | null {
  ensureInitialized();
  const booking = bookings.get(bookingId);
  if (!booking) {
    return null;
  }

  return isValidPayment(booking.payment) ? booking.payment : null;
}

export function setPayment(bookingId: string, payment: PaymentInfo): void {
  ensureInitialized();
  const booking = bookings.get(bookingId);
  if (!booking) {
    throw new Error("予約が見つかりません。");
  }

  bookings.set(bookingId, { ...booking, payment });
  persist();
}

export async function confirmBooking(bookingId: string): Promise<Booking> {
  ensureInitialized();
  const booking = bookings.get(bookingId);
  if (!booking) {
    throw new Error("予約が見つかりません。");
  }
  if (!isValidPassenger(booking.passengers)) {
    throw new Error("搭乗者情報が入力されていません。");
  }
  if (!isValidPayment(booking.payment)) {
    throw new Error("支払情報が入力されていません。");
  }

  const confirmed: StoredBooking = { ...booking, status: "confirmed" };
  bookings.set(bookingId, confirmed);
  persist();

  return confirmed;
}

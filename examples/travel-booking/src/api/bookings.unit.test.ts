import { beforeEach, describe, test, vi } from "vitest";

/**
 * 振る舞いを切り替えられる localStorage のスタブを作成します。
 */
function stubStorage(overrides: Partial<Record<"get" | "set", () => never>> = {}) {
  const store = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => {
      if (overrides.get) {
        overrides.get();
      }

      return store.has(key) ? (store.get(key) as string) : null;
    },
    setItem: (key: string, value: string) => {
      if (overrides.set) {
        overrides.set();
      }

      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
  });

  return store;
}

/**
 * モジュール状態を初期化して bookings モジュールを取り直します。
 */
async function freshBookings() {
  vi.resetModules();

  return import("./bookings.js");
}

const INPUT = { from: "TYO", to: "OSA", date: "2026-10-10", adults: 2, flightId: "JL101" };

beforeEach(() => {
  stubStorage();
});

describe("createBooking", () => {
  test("予約を作成する", async ({ expect }) => {
    // 準備
    const api = await freshBookings();

    // 実行
    const booking = await api.createBooking(INPUT);

    // 検証
    expect(booking.id).toBe("booking-1");
    expect(booking.status).toBe("draft");
    expect(booking.flight.id).toBe("JL101");
    expect(booking.flight.date).toBe("2026-10-10");
    expect(await api.findBooking(booking.id)).toStrictEqual(booking);
  });

  test("日付が空なら便の日付を維持する", async ({ expect }) => {
    // 準備
    const api = await freshBookings();

    // 実行
    const booking = await api.createBooking({ ...INPUT, date: "" });

    // 検証
    expect(booking.flight.date).toBe("2026-10-10");
  });

  test("存在しない便は失敗する", async ({ expect }) => {
    // 準備
    const api = await freshBookings();

    // 実行と検証
    await expect(api.createBooking({ ...INPUT, flightId: "unknown" })).rejects.toThrow(
      "便が見つかりません",
    );
  });

  test("保存済みの予約と番号を引き継ぐ", async ({ expect }) => {
    // 準備
    const store = stubStorage();
    store.set("pera1-travel-booking:booking-counter", "7");
    store.set(
      "pera1-travel-booking:bookings",
      JSON.stringify([
        {
          id: "booking-6",
          from: "TYO",
          to: "OSA",
          date: "",
          adults: 1,
          flight: { id: "JL101" },
          passengers: null,
          payment: null,
          status: "draft",
          createdAt: "",
        },
      ]),
    );
    const api = await freshBookings();

    // 実行
    const booking = await api.createBooking(INPUT);

    // 検証
    expect(booking.id).toBe("booking-7");
    expect((await api.findBooking("booking-6"))?.id).toBe("booking-6");
  });

  test("不正なカウンターは無視する", async ({ expect }) => {
    // 準備
    const store = stubStorage();
    store.set("pera1-travel-booking:booking-counter", "壊れた");
    const api = await freshBookings();

    // 実行
    const booking = await api.createBooking(INPUT);

    // 検証
    expect(booking.id).toBe("booking-1");
  });

  test("1未満のカウンターは無視する", async ({ expect }) => {
    // 準備
    const store = stubStorage();
    store.set("pera1-travel-booking:booking-counter", "0");
    const api = await freshBookings();

    // 実行
    const booking = await api.createBooking(INPUT);

    // 検証
    expect(booking.id).toBe("booking-1");
  });

  test("不正な保存値は飛ばす", async ({ expect }) => {
    // 準備
    const store = stubStorage();
    store.set(
      "pera1-travel-booking:bookings",
      JSON.stringify([
        { nope: 1 },
        { id: "booking-0", flight: { id: "JL101" } },
        { id: "xyz", flight: { id: "JL101" } },
        "文字列",
      ]),
    );
    const api = await freshBookings();

    // 実行と検証
    expect((await api.findBooking("booking-0"))?.id).toBe("booking-0");
    expect(await api.findBooking("booking-1")).toBeUndefined();
  });

  test("配列以外の保存値は無視する", async ({ expect }) => {
    // 準備
    const store = stubStorage();
    store.set("pera1-travel-booking:bookings", JSON.stringify({ id: "booking-1" }));
    const api = await freshBookings();

    // 実行と検証
    expect(await api.findBooking("booking-1")).toBeUndefined();
  });

  test("壊れた保存値は空として扱う", async ({ expect }) => {
    // 準備
    const store = stubStorage();
    store.set("pera1-travel-booking:bookings", "{壊れた");
    const api = await freshBookings();

    // 実行と検証
    expect(await api.findBooking("booking-1")).toBeUndefined();
  });

  test("読み取り失敗は空として扱う", async ({ expect }) => {
    // 準備
    stubStorage({
      get: () => {
        throw new Error("locked");
      },
    });
    const api = await freshBookings();

    // 実行と検証
    expect(await api.findBooking("booking-1")).toBeUndefined();
  });

  test("保存失敗でも予約自体は返す", async ({ expect }) => {
    // 準備
    stubStorage({
      set: () => {
        throw new Error("locked");
      },
    });
    const api = await freshBookings();

    // 実行
    const booking = await api.createBooking(INPUT);

    // 検証
    expect(booking.id).toBe("booking-1");
  });
});

describe("findBooking", () => {
  test("存在しない予約は undefined を返す", async ({ expect }) => {
    // 準備
    const api = await freshBookings();

    // 実行と検証
    expect(await api.findBooking("unknown")).toBeUndefined();
  });
});

describe("getPassengers", () => {
  test("存在しない予約は null を返す", async ({ expect }) => {
    // 準備
    const api = await freshBookings();

    // 実行と検証
    expect(api.getPassengers("unknown")).toBeNull();
  });

  test("未入力は null を返す", async ({ expect }) => {
    // 準備
    const api = await freshBookings();
    const booking = await api.createBooking(INPUT);

    // 実行と検証
    expect(api.getPassengers(booking.id)).toBeNull();
  });

  test("入力済みを返す", async ({ expect }) => {
    // 準備
    const api = await freshBookings();
    const booking = await api.createBooking(INPUT);
    api.setPassengers(booking.id, { name: "山田", email: "yamada@example.com" });

    // 実行と検証
    expect(api.getPassengers(booking.id)).toStrictEqual({
      name: "山田",
      email: "yamada@example.com",
    });
  });

  test("項目不足の搭乗者は null を返す", async ({ expect }) => {
    // 準備
    const store = stubStorage();
    store.set(
      "pera1-travel-booking:bookings",
      JSON.stringify([
        {
          id: "booking-1",
          from: "TYO",
          to: "OSA",
          date: "",
          adults: 1,
          flight: { id: "JL101" },
          passengers: { name: "山田" },
          payment: null,
          status: "draft",
          createdAt: "",
        },
      ]),
    );
    const api = await freshBookings();

    // 実行と検証
    expect(api.getPassengers("booking-1")).toBeNull();
  });

  test("搭乗者の値がオブジェクト以外は null を返す", async ({ expect }) => {    // 準備
    const store = stubStorage();
    store.set(
      "pera1-travel-booking:bookings",
      JSON.stringify([
        {
          id: "booking-1",
          from: "TYO",
          to: "OSA",
          date: "",
          adults: 1,
          flight: { id: "JL101" },
          passengers: "文字列",
          payment: "文字列",
          status: "draft",
          createdAt: "",
        },
      ]),
    );
    const api = await freshBookings();

    // 実行と検証
    expect(api.getPassengers("booking-1")).toBeNull();
    expect(api.getPayment("booking-1")).toBeNull();
  });
});

describe("setPassengers", () => {
  test("存在しない予約は失敗する", async ({ expect }) => {
    // 準備
    const api = await freshBookings();

    // 実行と検証
    expect(() => api.setPassengers("unknown", { name: "山田", email: "y@example.com" })).toThrow(
      "予約が見つかりません",
    );
  });
});

describe("getPayment", () => {
  test("存在しない予約は null を返す", async ({ expect }) => {
    // 準備
    const api = await freshBookings();

    // 実行と検証
    expect(api.getPayment("unknown")).toBeNull();
  });

  test("未入力は null を返す", async ({ expect }) => {
    // 準備
    const api = await freshBookings();
    const booking = await api.createBooking(INPUT);

    // 実行と検証
    expect(api.getPayment(booking.id)).toBeNull();
  });

  test("入力済みを返す", async ({ expect }) => {
    // 準備
    const api = await freshBookings();
    const booking = await api.createBooking(INPUT);
    api.setPayment(booking.id, { cardNumber: "4111", expiry: "12/30", cvc: "123" });

    // 実行と検証
    expect(api.getPayment(booking.id)).toStrictEqual({
      cardNumber: "4111",
      expiry: "12/30",
      cvc: "123",
    });
  });

  test("不正な値は null を返す", async ({ expect }) => {
    // 準備
    const store = stubStorage();
    store.set(
      "pera1-travel-booking:bookings",
      JSON.stringify([
        {
          id: "booking-1",
          from: "TYO",
          to: "OSA",
          date: "",
          adults: 1,
          flight: { id: "JL101" },
          passengers: null,
          payment: { cardNumber: "4111" },
          status: "draft",
          createdAt: "",
        },
      ]),
    );
    const api = await freshBookings();

    // 実行と検証
    expect(api.getPayment("booking-1")).toBeNull();
  });
});

describe("setPayment", () => {
  test("存在しない予約は失敗する", async ({ expect }) => {
    // 準備
    const api = await freshBookings();

    // 実行と検証
    expect(() =>
      api.setPayment("unknown", { cardNumber: "4111", expiry: "12/30", cvc: "123" }),
    ).toThrow("予約が見つかりません");
  });
});

describe("confirmBooking", () => {
  test("入力済みなら確定する", async ({ expect }) => {
    // 準備
    const api = await freshBookings();
    const booking = await api.createBooking(INPUT);
    api.setPassengers(booking.id, { name: "山田", email: "yamada@example.com" });
    api.setPayment(booking.id, { cardNumber: "4111", expiry: "12/30", cvc: "123" });

    // 実行
    const confirmed = await api.confirmBooking(booking.id);

    // 検証
    expect(confirmed.status).toBe("confirmed");
  });

  test("存在しない予約は失敗する", async ({ expect }) => {
    // 準備
    const api = await freshBookings();

    // 実行と検証
    await expect(api.confirmBooking("unknown")).rejects.toThrow("予約が見つかりません");
  });

  test("搭乗者なしでは失敗する", async ({ expect }) => {
    // 準備
    const api = await freshBookings();
    const booking = await api.createBooking(INPUT);

    // 実行と検証
    await expect(api.confirmBooking(booking.id)).rejects.toThrow("搭乗者情報");
  });

  test("支払情報なしでは失敗する", async ({ expect }) => {
    // 準備
    const api = await freshBookings();
    const booking = await api.createBooking(INPUT);
    api.setPassengers(booking.id, { name: "山田", email: "yamada@example.com" });

    // 実行と検証
    await expect(api.confirmBooking(booking.id)).rejects.toThrow("支払情報");
  });
});

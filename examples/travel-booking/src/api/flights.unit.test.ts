import { describe, test } from "vitest";

import { findFlight, searchFlights } from "./flights.js";

describe("searchFlights", () => {
  test("区間で絞り込む", async ({ expect }) => {
    // 実行
    const result = await searchFlights({ from: "TYO", to: "OSA", date: "" });

    // 検証
    expect(result.map((flight) => flight.id)).toStrictEqual(["JL101", "NH103", "MM105"]);
  });

  test("出発地だけでも絞り込む", async ({ expect }) => {
    // 実行
    const result = await searchFlights({ from: "OSA", to: "", date: "" });

    // 検証
    expect(result.map((flight) => flight.id)).toStrictEqual(["JL202", "NH204"]);
  });

  test("到着地だけでも絞り込む", async ({ expect }) => {
    // 実行
    const result = await searchFlights({ from: "", to: "SPK", date: "" });

    // 検証
    expect(result.map((flight) => flight.id)).toStrictEqual(["JL301", "NH303"]);
  });

  test("条件なしは全件返す", async ({ expect }) => {
    // 実行
    const result = await searchFlights({ from: "", to: "", date: "" });

    // 検証
    expect(result).toHaveLength(8);
  });

  test("日付は表示用に上書きする", async ({ expect }) => {
    // 実行
    const result = await searchFlights({ from: "TYO", to: "OSA", date: "2026-12-31" });

    // 検証
    expect(result.every((flight) => flight.date === "2026-12-31")).toBe(true);
  });

  test("前後の空白と小文字を正規化する", async ({ expect }) => {
    // 実行
    const result = await searchFlights({ from: " tyo ", to: " osa ", date: "" });

    // 検証
    expect(result).toHaveLength(3);
  });
});

describe("findFlight", () => {
  test("存在する便を返す", async ({ expect }) => {
    // 実行
    const result = await findFlight("JL101");

    // 検証
    expect(result?.airline).toBe("JAL");
  });

  test("存在しない便は undefined を返す", async ({ expect }) => {
    // 実行と検証
    expect(await findFlight("unknown")).toBeUndefined();
  });
});

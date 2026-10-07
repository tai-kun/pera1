import { describe, test } from "vitest";

import { LoaderDataNotFoundError } from "../../src/core/errors.js";

describe("エラーメッセージの分岐網羅", () => {
  test("LoaderDataNotFoundError で匿名関数のとき anonymous になる（英語）", ({ expect }) => {
    // 準備
    const anon = () => {};
    Object.defineProperty(anon, "name", { value: "" });

    // 実行
    const error = new LoaderDataNotFoundError({ loader: anon });

    // 検証
    expect(error.message).toContain("anonymous");
  });
});

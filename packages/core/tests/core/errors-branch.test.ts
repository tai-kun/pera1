import { setGlobalConfig } from "valibot";
import { describe, test } from "vitest";

import { LoaderConditionError, LoaderDataNotFoundError } from "../../src/core/errors.js";

describe("エラーメッセージの分岐網羅", () => {
  test("getTypeName が空文字のとき unknown になる (英語)", ({ expect }) => {
    // 準備: type-name が空文字を返すオブジェクト
    const weird: any = {};
    weird.constructor = () => {};

    // 実行
    const error = new LoaderConditionError({
      url: "/test",
      returnValue: weird,
      shouldReload: () => true,
    });

    // 検証
    expect(error.message).toBe("Expected boolean, but got unknown");
  });

  test("getTypeName が空文字のとき unknown になる (日本語)", ({ expect }) => {
    // 準備
    setGlobalConfig({ lang: "ja" });
    try {
      const weird: any = {};
      weird.constructor = () => {};

      // 実行
      const error = new LoaderConditionError({
        url: "/test",
        returnValue: weird,
        shouldReload: () => true,
      });

      // 検証
      expect(error.message).toContain("unknown");
    } finally {
      setGlobalConfig({ lang: "en" });
    }
  });

  test("LoaderDataNotFoundError で匿名関数のとき anonymous になる (英語)", ({ expect }) => {
    // 準備
    const anon = () => {};
    Object.defineProperty(anon, "name", { value: "" });

    // 実行
    const error = new LoaderDataNotFoundError({ loader: anon });

    // 検証
    expect(error.message).toContain("anonymous");
  });
});

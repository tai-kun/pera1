import { describe, test } from "vitest";

import unreachable from "../../src/core/_unreachable.js";
import { UnreachableError } from "../../src/core/errors.js";

describe("unreachable", () => {
  test("引数なしで呼び出したとき UnreachableError を投げる", ({ expect }) => {
    // 実行と検証
    expect(() => unreachable()).toThrow(UnreachableError);
    expect(() => unreachable()).toThrow("Unreachable code reached");
  });

  test("値ありで呼び出したとき値をメタに含む UnreachableError を投げる", ({ expect }) => {
    // 準備
    const value = "impossible";

    // 実行と検証
    expect(() => unreachable(value as never)).toThrow(UnreachableError);
    try {
      unreachable(value as never);
    } catch (error) {
      // 検証
      expect(error).toBeInstanceOf(UnreachableError);
      expect((error as UnreachableError).meta).toStrictEqual({ value });
    }
  });

  test("数値を渡したときもメタに保持される", ({ expect }) => {
    // 準備
    const value = 123 as never;

    // 実行
    try {
      unreachable(value);
    } catch (error) {
      // 検証
      expect((error as UnreachableError).meta).toStrictEqual({ value: 123 });
    }
  });
});

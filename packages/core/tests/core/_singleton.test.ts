/* oxlint-disable vitest/require-mock-type-parameters */
import { describe, test, vi } from "vitest";

import singleton from "../../src/core/_singleton.js";

describe("singleton", () => {
  test("同一キーで同じインスタンスを返す", ({ expect }) => {
    // 準備
    const key = Symbol("singleton-test-1");
    const factory = vi.fn(() => ({ value: 42 }));

    // 実行
    const first = singleton(key, factory);
    const second = singleton(key, factory);

    // 検証
    expect(first).toBe(second);
    expect(factory).toHaveBeenCalledTimes(1);
  });

  test("異なるキーで異なるインスタンスを返す", ({ expect }) => {
    // 準備
    const keyA = Symbol("singleton-test-A");
    const keyB = Symbol("singleton-test-B");

    // 実行
    const a = singleton(keyA, () => ({ id: "A" }));
    const b = singleton(keyB, () => ({ id: "B" }));

    // 検証
    expect(a).not.toBe(b);
    expect(a).toStrictEqual({ id: "A" });
    expect(b).toStrictEqual({ id: "B" });
  });

  test("ファクトリーの戻り値がそのまま返される", ({ expect }) => {
    // 準備
    const key = Symbol("singleton-test-value");
    const obj = { foo: "bar" };

    // 実行
    const result = singleton(key, () => obj);

    // 検証
    expect(result).toBe(obj);
  });
});

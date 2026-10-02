import { describe, test } from "vitest";

import { UnexpectedValidationError } from "../../src/core/errors.js";
import expectHistoryEntry from "../../src/core/expect-history-entry.js";

describe("有効な HistoryEntryLike オブジェクトが渡された場合", () => {
  test("有効なオブジェクトを渡したとき、同じ構造を持つ HistoryEntry オブジェクトを返す", ({
    expect,
  }) => {
    // 準備
    const entry = {
      id: "123e4567-e89b-12d3-a456-426614174000",
      url: "https://example.com",
      index: 0,
    };

    // 実行
    const result = expectHistoryEntry(entry);

    // 検証
    expect(result).toStrictEqual({
      id: "123e4567-e89b-12d3-a456-426614174000",
      url: new URL("https://example.com/"),
      index: 0,
    });
  });

  test("index が最小値である 0 のとき、HistoryEntry オブジェクトを返す", ({ expect }) => {
    // 準備
    const entry = {
      id: "123e4567-e89b-12d3-a456-426614174000",
      url: "https://example.com",
      index: 0,
    };

    // 実行
    const result = expectHistoryEntry(entry);

    // 検証
    expect(result).toStrictEqual({
      id: "123e4567-e89b-12d3-a456-426614174000",
      url: new URL("https://example.com/"),
      index: 0,
    });
  });

  test("index が大きな正の整数であるとき、HistoryEntry オブジェクトを返す", ({ expect }) => {
    // 準備
    const entry = {
      id: "123e4567-e89b-12d3-a456-426614174000",
      url: "https://example.com",
      index: 2147483647,
    };

    // 実行
    const result = expectHistoryEntry(entry);

    // 検証
    expect(result).toStrictEqual({
      id: "123e4567-e89b-12d3-a456-426614174000",
      url: new URL("https://example.com/"),
      index: 2147483647,
    });
  });
});

describe("空値が渡された場合", () => {
  test("null を渡したとき、null を返す", ({ expect }) => {
    // 準備
    const entry = null;

    // 実行
    const result = expectHistoryEntry(entry);

    // 検証
    expect(result).toBe(null);
  });

  test("undefined を渡したとき、null を返す", ({ expect }) => {
    // 準備
    const entry = undefined;

    // 実行
    const result = expectHistoryEntry(entry);

    // 検証
    expect(result).toBe(null);
  });
});

describe("スキーマ検証を満たさない不正なオブジェクトが渡された場合", () => {
  test("id が不正な形式であるとき、エラーを投げる", ({ expect }) => {
    // 準備
    const entry = {
      id: "invalid_id_!", // 不正な ID 形式を想定する。
      url: "https://example.com",
      index: 0,
    };

    // 実行と検証
    expect(() => expectHistoryEntry(entry)).toThrow(UnexpectedValidationError);
  });

  test("url が不適切な型であるとき、エラーを投げる", ({ expect }) => {
    // 準備
    const entry = {
      id: "123e4567-e89b-12d3-a456-426614174000",
      url: 12345, // 不適切な型を想定する。
      index: 0,
    };

    // 実行と検証
    // @ts-expect-error - 不正な型をテストする
    expect(() => expectHistoryEntry(entry)).toThrow(UnexpectedValidationError);
  });

  test("index が整数ではないとき、エラーを投げる", ({ expect }) => {
    // 準備
    const entry = {
      id: "123e4567-e89b-12d3-a456-426614174000",
      url: "https://example.com",
      index: 1.5,
    };

    // 実行と検証
    expect(() => expectHistoryEntry(entry)).toThrow(UnexpectedValidationError);
  });

  test("index が最小値未満である -2 のとき、エラーを投げる", ({ expect }) => {
    // 準備
    const entry = {
      id: "123e4567-e89b-12d3-a456-426614174000",
      url: "https://example.com",
      index: -2,
    };

    // 実行と検証
    expect(() => expectHistoryEntry(entry)).toThrow(UnexpectedValidationError);
  });

  test("必須プロパティが欠落しているとき、エラーを投げる", ({ expect }) => {
    // 準備
    const entry = {
      id: "123e4567-e89b-12d3-a456-426614174000",
      url: "https://example.com",
      // index プロパティの欠落を想定する。
    };

    // 実行と検証
    // @ts-expect-error - 必須プロパティ欠落をテストする
    expect(() => expectHistoryEntry(entry)).toThrow(UnexpectedValidationError);
  });
});

describe("スキーマは満たすが業務ロジックの制約を満たさない場合", () => {
  test("url が null であるとき、null を返す", ({ expect }) => {
    // 準備
    const entry = {
      id: "123e4567-e89b-12d3-a456-426614174000",
      url: null,
      index: 0,
    };

    // 実行
    const result = expectHistoryEntry(entry);

    // 検証
    expect(result).toBe(null);
  });

  test("index が非活性状態を示す -1 であるとき、null を返す", ({ expect }) => {
    // 準備
    const entry = {
      id: "123e4567-e89b-12d3-a456-426614174000",
      url: "https://example.com",
      index: -1,
    };

    // 実行
    const result = expectHistoryEntry(entry);

    // 検証
    expect(result).toBe(null);
  });
});

describe("エッジケース", () => {
  test("余分なプロパティがあっても検証が通る", ({ expect }) => {
    // 準備
    const entry: any = {
      id: "550e8400-e29b-41d4-a716-446655440000",
      url: "https://example.com/",
      index: 0,
      extra: "x",
    };

    // 実行
    const result = expectHistoryEntry(entry);

    // 検証
    expect(result).not.toBeNull();
    expect(result!.id).toBe(entry.id);
  });

  test("float の index は検証エラーを投げる", ({ expect }) => {
    // 準備
    const entry: any = {
      id: "550e8400-e29b-41d4-a716-446655440000",
      url: "https://example.com/",
      index: 1.5,
    };

    // 実行と検証
    expect(() => expectHistoryEntry(entry)).toThrow();
  });

  test("NaN の index は検証エラーを投げる", ({ expect }) => {
    // 準備
    const entry: any = {
      id: "550e8400-e29b-41d4-a716-446655440000",
      url: "https://example.com/",
      index: Number.NaN,
    };

    // 実行と検証
    expect(() => expectHistoryEntry(entry)).toThrow();
  });
});

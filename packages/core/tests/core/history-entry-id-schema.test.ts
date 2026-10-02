import * as v from "valibot";
import { describe, test } from "vitest";

import HistoryEntryIdSchema from "../../src/core/history-entry-id-schema.js";

describe("インスタンス生成", () => {
  test("初回呼び出し時、スキーマオブジェクトが生成される", ({ expect }) => {
    // 準備と実行
    const schema = HistoryEntryIdSchema();

    // 検証
    expect(schema).toBeDefined();
  });

  test("複数回呼び出し時、初回と同一のスキーマインスタンスが返される", ({ expect }) => {
    // 準備
    const firstSchema = HistoryEntryIdSchema();

    // 実行
    const secondSchema = HistoryEntryIdSchema();

    // 検証
    expect(secondSchema).toBe(firstSchema);
  });
});

describe("正常系", () => {
  test("正当な UUID を検証したとき、入力値と同じ文字列が返される", ({ expect }) => {
    // 準備
    const schema = HistoryEntryIdSchema();
    const validUuid = "123e4567-e89b-12d3-a456-426614174000";

    // 実行
    const result = v.parse(schema, validUuid);

    // 検証
    expect(result).toBe(validUuid);
  });

  test("アルファベット大文字を含む UUID を検証したとき、成功して入力値と同じ文字列が返される", ({
    expect,
  }) => {
    // 準備
    const schema = HistoryEntryIdSchema();
    const uppercaseUuid = "123E4567-E89B-12D3-A456-426614174000";

    // 実行
    const result = v.parse(schema, uppercaseUuid);

    // 検証
    expect(result).toBe(uppercaseUuid);
  });
});

describe("エッジケース", () => {
  test("不正な UUID は検証エラーを投げる", ({ expect }) => {
    // 検証
    expect(() => v.parse(HistoryEntryIdSchema(), "not-uuid")).toThrow();
    expect(() => v.parse(HistoryEntryIdSchema(), "")).toThrow();
    expect(() => v.parse(HistoryEntryIdSchema(), 123 as unknown as string)).toThrow();
  });

  test("桁不足の UUID は検証エラーを投げる", ({ expect }) => {
    // 検証
    expect(() => v.parse(HistoryEntryIdSchema(), "550e8400-e29b-41d4-a716-44665544000")).toThrow();
  });
});

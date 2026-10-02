import * as v from "valibot";
import { describe, test } from "vitest";

import HistoryEntryUrlSchema from "../../src/core/history-entry-url-schema.js";

describe("インスタンス生成", () => {
  test("初回呼び出し時、スキーマオブジェクトが生成される", ({ expect }) => {
    // 準備と実行
    const schema = HistoryEntryUrlSchema();

    // 検証
    expect(schema).toBeDefined();
  });

  test("複数回呼び出し時、初回と同一のスキーマインスタンスが返される", ({ expect }) => {
    // 準備
    const firstSchema = HistoryEntryUrlSchema();

    // 実行
    const secondSchema = HistoryEntryUrlSchema();

    // 検証
    expect(secondSchema).toBe(firstSchema);
  });
});

describe("正常系", () => {
  test("クエリーパラメーターが昇順にソートされる", ({ expect }) => {
    // 準備
    const schema = HistoryEntryUrlSchema();
    const input = "https://example.com/page?c=3&a=1&b=2";

    // 実行
    const result = v.parse(schema, input);

    // 検証
    expect(result).toBeInstanceOf(URL);
    expect(result.search).toBe("?a=1&b=2&c=3");
    expect(result.href).toBe("https://example.com/page?a=1&b=2&c=3");
  });
});

describe("エッジケース", () => {
  test("不正な URL は検証エラーを投げる", ({ expect }) => {
    // 検証
    expect(() => v.parse(HistoryEntryUrlSchema(), "not a url")).toThrow();
    expect(() => v.parse(HistoryEntryUrlSchema(), "")).toThrow();
  });

  test("相対 URL は検証エラーを投げる", ({ expect }) => {
    // 検証
    expect(() => v.parse(HistoryEntryUrlSchema(), "/relative")).toThrow();
  });

  test("query がソートされて正規化される", ({ expect }) => {
    // 実行
    const url = v.parse(HistoryEntryUrlSchema(), "https://example.com/a?z=1&a=2#h");

    // 検証
    expect(url.search).toBe("?a=2&z=1");
  });
});

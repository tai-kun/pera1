import * as v from "valibot";
import { describe, test } from "vitest";

import HistoryEntryUrlSchema from "../../src/core/history-entry-url-schema.js";

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
});

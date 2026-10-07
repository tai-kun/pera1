import * as v from "valibot";
import { describe, test } from "vitest";

import HistoryEntryUrlSchema from "../../src/core/history-entry-url-schema.js";
import startAction from "../../src/core/start-action.js";

const url = (s: string) => v.parse(HistoryEntryUrlSchema(), s);

describe("startAction のルートパスマッチ", () => {
  test("ルートパス / に対して前方一致でマッチする", ({ expect, signal }) => {
    // 準備
    const request = {
      url: url("http://localhost/foo/bar"),
      formData: new FormData(),
      signal,
    };
    const fn = () => "root";
    const routes = [{ action: fn, urlPath: "/", params: {} }];

    // 実行
    const result = startAction(routes, request);

    // 検証
    expect(result).not.toBeNull();
    expect(result!.func).toBe(fn);
  });
});

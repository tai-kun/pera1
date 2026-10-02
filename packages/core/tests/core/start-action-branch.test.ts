import { NinjaPromise } from "ninja-promise";
import * as v from "valibot";
import { describe, test, vi } from "vitest";

import HistoryEntryUrlSchema from "../../src/core/history-entry-url-schema.js";
import type { HistoryEntryUrl } from "../../src/core/history-entry-url-schema.js";
import { UnreachableError } from "../../src/core/errors.js";
import startAction from "../../src/core/start-action.js";

const url = (s: string) => v.parse(HistoryEntryUrlSchema(), s);

describe("startAction の分岐網羅", () => {
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

  test("完全一致でマッチする", ({ expect, signal }) => {
    // 準備
    const request = {
      url: url("http://localhost/user"),
      formData: new FormData(),
      signal,
    };
    const fn = () => "exact";
    const routes = [{ action: fn, urlPath: "/user", params: {} }];

    // 実行
    const result = startAction(routes, request);

    // 検証
    expect(result!.func).toBe(fn);
  });

  test("末尾スラッシュ境界でマッチする", ({ expect, signal }) => {
    // 準備
    const request = {
      url: url("http://localhost/user/profile"),
      formData: new FormData(),
      signal,
    };
    const fn = () => "prefix";
    const routes = [{ action: fn, urlPath: "/user", params: { a: "1" } }];

    // 実行
    const result = startAction(routes, request);

    // 検証
    expect(result!.func).toBe(fn);
  });

  test("不正なステータスでは UnreachableError を投げる", ({ expect, signal }) => {
    // 準備
    using spy = vi.spyOn(NinjaPromise, "try").mockReturnValue({ status: "weird" } as any);
    const request = {
      url: url("http://localhost/"),
      formData: new FormData(),
      signal,
    };
    const routes = [{ action: () => "x", urlPath: "/", params: {} }];

    // 実行と検証
    expect(() => startAction(routes, request)).toThrow(UnreachableError);
    expect(spy).toHaveBeenCalled();
  });
});

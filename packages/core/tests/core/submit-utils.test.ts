import { describe, test } from "vitest";

import { toSubmitArgs } from "../../src/core/submit-utils.js";

describe("toSubmitArgs", () => {
  test("FormData は FORM_DATA になる", ({ expect }) => {
    // 準備
    const fd = new FormData();
    fd.set("x", "1");

    // 実行
    const args = toSubmitArgs(fd, "/default");

    // 検証
    expect(args).toStrictEqual({ type: "FORM_DATA", target: fd, action: "/default" });
  });

  test("FormData で action を上書きできる", ({ expect }) => {
    // 準備
    const fd = new FormData();

    // 実行
    const args = toSubmitArgs(fd, "/default", { action: "/custom" });

    // 検証
    expect(args).toStrictEqual({ type: "FORM_DATA", target: fd, action: "/custom" });
  });

  test("URLSearchParams は URL_SEARCH_PARAMS になり既定は push になる", ({ expect }) => {
    // 準備
    const sp = new URLSearchParams("a=1");

    // 実行
    const args = toSubmitArgs(sp, "/search");

    // 検証
    expect(args).toStrictEqual({
      type: "URL_SEARCH_PARAMS",
      target: sp,
      action: "/search",
      history: "push",
    });
  });

  test("replace が true のとき history は replace になる", ({ expect }) => {
    // 準備
    const sp = new URLSearchParams("a=1");

    // 実行
    const args = toSubmitArgs(sp, "/search", { replace: true });

    // 検証
    expect(args.type).toBe("URL_SEARCH_PARAMS");
    if (args.type === "URL_SEARCH_PARAMS") {
      expect(args.history).toBe("replace");
    }
  });
});

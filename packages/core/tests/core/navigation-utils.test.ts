import { describe, test } from "vitest";

import { toNavigateArgs } from "../../src/core/navigation-utils.js";
import RoutePath from "../../src/core/route-path.js";

describe("toNavigateArgs", () => {
  test("数値は MOVE になる", ({ expect }) => {
    // 実行
    const args = toNavigateArgs(-1);

    // 検証
    expect(args).toStrictEqual({ type: "MOVE", delta: -1 });
  });

  test("文字列は STATIC LINK になる", ({ expect }) => {
    // 実行
    const args = toNavigateArgs("/hello", { replace: true });

    // 検証
    expect(args).toStrictEqual({
      type: "LINK",
      to: { type: "STATIC", path: "/hello" },
      history: "replace",
    });
  });

  test("オブジェクトは DYNAMIC LINK になり patch が反映される", ({ expect }) => {
    // 実行
    const args = toNavigateArgs({ pathname: "/a", search: "?x=1", hash: "#h" });
    expect(args.type).toBe("LINK");
    if (args.type !== "LINK" || args.to.type !== "DYNAMIC") {
      throw new Error("unexpected");
    }

    // 検証
    const path = new RoutePath("/base?y=2#old");
    args.to.patch(path);
    expect(path.pathname).toBe("/a");
    expect(path.search).toBe("?x=1");
    expect(path.hash).toBe("#h");
  });

  test("関数形式は patch に委譲される", ({ expect }) => {
    // 実行
    const args = toNavigateArgs((p) => {
      p.pathname = "/fn";
    });
    if (args.type !== "LINK" || args.to.type !== "DYNAMIC") {
      throw new Error("unexpected");
    }

    // 検証
    const path = new RoutePath("/");
    args.to.patch(path);
    expect(path.pathname).toBe("/fn");
  });
});

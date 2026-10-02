import { describe, test } from "vitest";

import { toNavigateArgs } from "../../src/core/navigation-utils.js";
import RoutePath from "../../src/core/route-path.js";

describe("toNavigateArgs の部分パッチ", () => {
  test("pathname のみ指定したとき pathname だけが変わる", ({ expect }) => {
    // 準備
    const args = toNavigateArgs({ pathname: "/only-path" });
    if (args.type !== "LINK" || args.to.type !== "DYNAMIC") {
      throw new Error("unexpected");
    }

    // 実行
    const path = new RoutePath("/base?y=2#old");
    args.to.patch(path);

    // 検証
    expect(path.pathname).toBe("/only-path");
    expect(path.search).toBe("?y=2");
    expect(path.hash).toBe("#old");
  });

  test("search のみ指定したとき search だけが変わる", ({ expect }) => {
    // 準備
    const args = toNavigateArgs({ search: "?x=9" });
    if (args.type !== "LINK" || args.to.type !== "DYNAMIC") {
      throw new Error("unexpected");
    }

    // 実行
    const path = new RoutePath("/base?y=2#old");
    args.to.patch(path);

    // 検証
    expect(path.pathname).toBe("/base");
    expect(path.search).toBe("?x=9");
    expect(path.hash).toBe("#old");
  });

  test("hash のみ指定したとき hash だけが変わる", ({ expect }) => {
    // 準備
    const args = toNavigateArgs({ hash: "#new" });
    if (args.type !== "LINK" || args.to.type !== "DYNAMIC") {
      throw new Error("unexpected");
    }

    // 実行
    const path = new RoutePath("/base?y=2#old");
    args.to.patch(path);

    // 検証
    expect(path.pathname).toBe("/base");
    expect(path.search).toBe("?y=2");
    expect(path.hash).toBe("#new");
  });

  test("空オブジェクトでは何も変わらない", ({ expect }) => {
    // 準備
    const args = toNavigateArgs({});
    if (args.type !== "LINK" || args.to.type !== "DYNAMIC") {
      throw new Error("unexpected");
    }

    // 実行
    const path = new RoutePath("/base?y=2#old");
    const before = path.toString();
    args.to.patch(path);

    // 検証
    expect(path.toString()).toBe(before);
  });

  test("replace 省略時は push になる", ({ expect }) => {
    // 実行
    const args = toNavigateArgs("/hello");

    // 検証
    expect(args).toStrictEqual({
      type: "LINK",
      to: { type: "STATIC", path: "/hello" },
      history: "push",
    });
  });

  test("オブジェクト形式で replace 指定ができる", ({ expect }) => {
    // 実行
    const args = toNavigateArgs({ pathname: "/a" }, { replace: true });

    // 検証
    expect(args.type).toBe("LINK");
    if (args.type === "LINK") {
      expect(args.history).toBe("replace");
    }
  });

  test("関数形式で replace 指定ができる", ({ expect }) => {
    // 実行
    const args = toNavigateArgs((p) => {
      p.pathname = "/fn";
    }, { replace: true });

    // 検証
    expect(args.type).toBe("LINK");
    if (args.type === "LINK") {
      expect(args.history).toBe("replace");
    }
  });
});

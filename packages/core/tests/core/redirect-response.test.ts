import { describe, test, expectTypeOf } from "vitest";

import RedirectResponse from "../../src/core/redirect-response.js";
import redirect from "../../src/utils/redirect.js";

describe("正常なパス文字列を解析する場合", () => {
  test("完全なパスを渡したとき、パス名とクエリーとハッシュに分解される", ({ expect }) => {
    // 準備
    const destination = "/users/profile?id=123&sort=desc#bio";

    // 実行
    const response = new RedirectResponse(destination);

    // 検証
    expect({
      pathname: response.pathname,
      search: response.search,
      hash: response.hash,
    }).toStrictEqual({
      pathname: "/users/profile",
      search: "?id=123&sort=desc",
      hash: "#bio",
    });
  });

  test("パス名のみを渡したとき、クエリーとハッシュは空文字列になる", ({ expect }) => {
    // 準備
    const destination = "/dashboard";

    // 実行
    const response = new RedirectResponse(destination);

    // 検証
    expect({
      pathname: response.pathname,
      search: response.search,
      hash: response.hash,
    }).toStrictEqual({
      pathname: "/dashboard",
      search: "",
      hash: "",
    });
  });

  test("クエリー文字列のみを渡したとき、ハッシュは空文字列になる", ({ expect }) => {
    // 準備
    const destination = "?mode=dark";

    // 実行
    const response = new RedirectResponse(destination);

    // 検証
    expect({
      pathname: response.pathname,
      search: response.search,
      hash: response.hash,
    }).toStrictEqual({
      pathname: "/",
      search: "?mode=dark",
      hash: "",
    });
  });

  test("ハッシュのみを渡したとき、クエリーは空文字列になる", ({ expect }) => {
    // 準備
    const destination = "#section-2";

    // 実行
    const response = new RedirectResponse(destination);

    // 検証
    expect({
      pathname: response.pathname,
      search: response.search,
      hash: response.hash,
    }).toStrictEqual({
      pathname: "/",
      search: "",
      hash: "#section-2",
    });
  });

  test("ルートパスを渡したとき、パス名はルートになり他は空文字列になる", ({ expect }) => {
    // 準備
    const destination = "/";

    // 実行
    const response = new RedirectResponse(destination);

    // 検証
    expect({
      pathname: response.pathname,
      search: response.search,
      hash: response.hash,
    }).toStrictEqual({
      pathname: "/",
      search: "",
      hash: "",
    });
  });
});

describe("特殊なパス文字列を解析する場合", () => {
  test("連続する記号を含むパスを渡したとき、エラーを投げずにインスタンスが生成される", ({
    expect,
  }) => {
    // 準備
    const destination = "/path/to/??key==val##hash#sec";

    // 実行と検証
    expect(() => new RedirectResponse(destination)).not.toThrow();
  });

  test("1 万文字以上の長大文字列を渡したとき、エラーを投げずにインスタンスが生成される", ({
    expect,
  }) => {
    // 準備
    const destination = "/a".repeat(10000);

    // 実行と検証
    expect(() => new RedirectResponse(destination)).not.toThrow();
  });
});

describe("型安全と不変性が保証されているか確認する場合", () => {
  test("同名のプロパティを持つプレーンオブジェクトを代入しようとしたとき、コンパイルエラーとして検知される", () => {
    // 準備
    const plainObject = {
      pathname: "/path",
      search: "?query=1",
      hash: "#hash",
    };

    // 実行と検証
    expectTypeOf(plainObject).not.toEqualTypeOf<RedirectResponse>();
  });
});

describe("RedirectResponse のエッジケース", () => {
  test("redirect ユーティリティは RedirectResponse を返す", ({ expect }) => {
    // 実行
    const response = redirect("/target");

    // 検証
    expect(response).toBeInstanceOf(RedirectResponse);
    expect(response.pathname).toBe("/target");
  });

  test("query はソートされて保持される", ({ expect }) => {
    // 準備と実行
    const response = new RedirectResponse("/a?z=1&a=2");

    // 検証
    expect(response.search).toBe("?a=2&z=1");
  });

  test("pathname と search と hash が分解される", ({ expect }) => {
    // 準備と実行
    const response = new RedirectResponse("/path?x=1#sec");

    // 検証
    expect(response.pathname).toBe("/path");
    expect(response.search).toBe("?x=1");
    expect(response.hash).toBe("#sec");
  });

  test("相対パス風の入力も正規化される", ({ expect }) => {
    // 準備と実行
    const response = new RedirectResponse("relative/path");

    // 検証
    expect(response.pathname).toBe("/relative/path");
  });

  test("絶対 URL はパスとして取り込まれる", ({ expect }) => {
    // 準備と実行
    const response = new RedirectResponse("https://example.com/a");

    // 検証
    expect(response.pathname).toBe("/https:/example.com/a");
  });

  test("plain object と区別できる", ({ expect }) => {
    // 準備
    const response = new RedirectResponse("/a");
    const plain = { pathname: "/a", search: "", hash: "" };

    // 検証
    expect(plain instanceof RedirectResponse).toBe(false);
    expect(response instanceof RedirectResponse).toBe(true);
  });
});

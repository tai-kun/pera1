import { describe, test, expectTypeOf } from "vitest";

import RedirectResponse from "../../src/core/redirect-response.js";

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

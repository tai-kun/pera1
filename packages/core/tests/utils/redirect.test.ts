import { describe, test } from "vitest";

import RedirectResponse from "../../src/core/redirect-response.js";
import redirect from "../../src/utils/redirect.js";

describe("redirect", () => {
  test("RedirectResponse を返す", ({ expect }) => {
    // 実行
    const response = redirect("/target");

    // 検証
    expect(response).toBeInstanceOf(RedirectResponse);
    expect(response.pathname).toBe("/target");
  });

  test("query と hash を保持する", ({ expect }) => {
    // 実行
    const response = redirect("/path?a=2&b=1#sec");

    // 検証
    expect(response.pathname).toBe("/path");
    expect(response.search).toBe("?a=2&b=1");
    expect(response.hash).toBe("#sec");
  });

  test("空文字ではルートになる", ({ expect }) => {
    // 実行
    const response = redirect("");

    // 検証
    expect(response.pathname).toBe("/");
  });
});

import { describe, test } from "vitest";

import RedirectResponse from "../../src/core/redirect-response.js";
import redirect from "../../src/utils/redirect.js";

describe("redirect", () => {
  test("RedirectResponse を返す", ({ expect }) => {
    // 実行
    const response = redirect("/target?mode=dark#section");

    // 検証
    expect(response).toBeInstanceOf(RedirectResponse);
    expect(response.pathname).toBe("/target");
    expect(response.search).toBe("?mode=dark");
    expect(response.hash).toBe("#section");
  });
});

import { test } from "vitest";

import normalizePath from "../src/_path.js";

test("Windows の区切りを / に統一する", ({ expect }) => {
  // 実行と検証
  expect(normalizePath("src\\pages\\contacts\\$id.tsx")).toBe("src/pages/contacts/$id.tsx");
});

import { test } from "vitest";

import log from "../src/_logger.js";

test("ロガーを取得できる", ({ expect }) => {
  // 実行と検証
  expect(log).toBeDefined();
});

import { test } from "vitest";

import toErrorMessage from "../src/_error.js";

test("Errorのメッセージを取り出す", ({ expect }) => {
  // 実行と検証
  expect(toErrorMessage(new Error("失敗しました"))).toBe("失敗しました");
});

test("Error以外の値を文字列化する", ({ expect }) => {
  // 実行と検証
  expect(toErrorMessage("文字列の失敗")).toBe("文字列の失敗");
  expect(toErrorMessage(undefined)).toBe("undefined");
});

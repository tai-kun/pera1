import { describe, test } from "vitest";

import { findConversation, listConversations } from "./conversations.js";

describe("listConversations", () => {
  test("全会話を返す", async ({ expect }) => {
    // 実行
    const result = await listConversations();

    // 検証
    expect(result.map((conversation) => conversation.id)).toStrictEqual(["a", "b", "c"]);
  });
});

describe("findConversation", () => {
  test("存在する会話を返す", async ({ expect }) => {
    // 実行
    const result = await findConversation("a");

    // 検証
    expect(result?.messages).toHaveLength(2);
  });

  test("存在しない会話は undefined を返す", async ({ expect }) => {
    // 実行と検証
    expect(await findConversation("unknown")).toBeUndefined();
  });
});

import { describe, test } from "vitest";

import { listFeed, listPostsByUser } from "./posts.js";

describe("listFeed", () => {
  test("新しい順に全投稿を返す", async ({ expect }) => {
    // 実行
    const result = await listFeed();

    // 検証
    expect(result).toHaveLength(9);
    expect(result[0]?.id).toBe("alice-3");
    const dates = result.map((post) => post.createdAt);
    expect([...dates].sort().reverse()).toStrictEqual(dates);
  });
});

describe("listPostsByUser", () => {
  test("指定ユーザーの投稿だけ返す", async ({ expect }) => {
    // 実行
    const result = await listPostsByUser("alice");

    // 検証
    expect(result.map((post) => post.id)).toStrictEqual(["alice-3", "alice-2", "alice-1"]);
  });

  test("投稿がないユーザーは空配列を返す", async ({ expect }) => {
    // 実行と検証
    expect(await listPostsByUser("unknown")).toStrictEqual([]);
  });
});

import { describe, test } from "vitest";

import { findUser, listUsers } from "./users.js";

describe("listUsers", () => {
  test("全ユーザーを返す", async ({ expect }) => {
    // 実行
    const result = await listUsers();

    // 検証
    expect(result.map((user) => user.username)).toStrictEqual(["alice", "bob", "charlie", "dave"]);
  });
});

describe("findUser", () => {
  test("存在するユーザーを返す", async ({ expect }) => {
    // 実行
    const result = await findUser("bob");

    // 検証
    expect(result?.name).toBe("Bob Sato");
  });

  test("存在しないユーザーは undefined を返す", async ({ expect }) => {
    // 実行と検証
    expect(await findUser("unknown")).toBeUndefined();
  });
});

import { describe, test } from "vitest";

import { listMembers } from "./members.js";
import { listTasks, toggleTask } from "./tasks.js";

describe("listTasks", () => {
  test("プロジェクトのタスクを返す", async ({ expect }) => {
    // 実行
    const result = await listTasks("apollo");

    // 検証
    expect(result).toHaveLength(3);
  });

  test("未知のプロジェクトは空配列を返す", async ({ expect }) => {
    // 実行と検証
    expect(await listTasks("unknown")).toStrictEqual([]);
  });
});

describe("toggleTask", () => {
  test("タスクの完了状態を反転する", async ({ expect }) => {
    // 実行
    const result = await toggleTask("apollo", "apollo-2");

    // 検証
    expect(result?.find((task) => task.id === "apollo-2")?.done).toBe(true);
    expect(result?.find((task) => task.id === "apollo-1")?.done).toBe(true);
  });

  test("未知のプロジェクトは undefined を返す", async ({ expect }) => {
    // 実行と検証
    expect(await toggleTask("unknown", "apollo-1")).toBeUndefined();
  });
});

describe("listMembers", () => {
  test("プロジェクトのメンバーを返す", async ({ expect }) => {
    // 実行
    const result = await listMembers("apollo");

    // 検証
    expect(result.map((member) => member.name)).toStrictEqual(["Admin", "Alice"]);
  });

  test("未知のプロジェクトはフォールバックを返す", async ({ expect }) => {
    // 実行
    const result = await listMembers("unknown");

    // 検証
    expect(result.map((member) => member.name)).toStrictEqual(["Admin"]);
  });
});

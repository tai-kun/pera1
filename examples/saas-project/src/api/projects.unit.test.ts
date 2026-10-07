import { beforeEach, describe, test, vi } from "vitest";

import { createProject, findProject, listProjects } from "./projects.js";

/**
 * 振る舞いを切り替えられる localStorage のスタブを作成します。
 */
function stubStorage(overrides: Partial<Record<"get" | "set", () => never>> = {}) {
  const store = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => {
      if (overrides.get) {
        overrides.get();
      }

      return store.has(key) ? (store.get(key) as string) : null;
    },
    setItem: (key: string, value: string) => {
      if (overrides.set) {
        overrides.set();
      }

      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
  });

  return store;
}

/**
 * モジュール状態を初期化して projects モジュールを取り直します。
 */
async function freshProjects() {
  vi.resetModules();

  return import("./projects.js");
}

beforeEach(() => {
  stubStorage();
});

describe("listProjects", () => {
  test("初期プロジェクトを返す", async ({ expect }) => {
    // 準備
    const { listProjects } = await freshProjects();

    // 実行
    const result = await listProjects();

    // 検証
    expect(result.map((project) => project.id)).toStrictEqual(["apollo", "zephyr", "orion"]);
  });

  test("保存済みの追加プロジェクトを復元する", async ({ expect }) => {
    // 準備
    const store = stubStorage();
    store.set(
      "pera1-saas-project:custom-projects",
      JSON.stringify([{ id: "custom", name: "Custom", description: "" }]),
    );
    const { listProjects } = await freshProjects();

    // 実行
    const result = await listProjects();

    // 検証
    expect(result.map((project) => project.id)).toContain("custom");
  });

  test("不正な保存値は飛ばす", async ({ expect }) => {
    // 準備
    const store = stubStorage();
    store.set(
      "pera1-saas-project:custom-projects",
      JSON.stringify([{ id: 1 }, { id: "nodesc", name: "NoDesc" }, "文字列"]),
    );
    const { listProjects, findProject } = await freshProjects();

    // 実行
    const result = await listProjects();

    // 検証
    expect(result).toHaveLength(4);
    expect((await findProject("nodesc"))?.description).toBe("");
  });

  test("配列以外の保存値は無視する", async ({ expect }) => {
    // 準備
    const store = stubStorage();
    store.set("pera1-saas-project:custom-projects", JSON.stringify({ id: "x" }));
    const { listProjects } = await freshProjects();

    // 実行と検証
    expect(await listProjects()).toHaveLength(3);
  });

  test("壊れた保存値は初期データで続行する", async ({ expect }) => {
    // 準備
    const store = stubStorage();
    store.set("pera1-saas-project:custom-projects", "{壊れた");
    const { listProjects } = await freshProjects();

    // 実行と検証
    expect(await listProjects()).toHaveLength(3);
  });

  test("読み取り失敗は初期データで続行する", async ({ expect }) => {
    // 準備
    stubStorage({
      get: () => {
        throw new Error("locked");
      },
    });
    const { listProjects } = await freshProjects();

    // 実行と検証
    expect(await listProjects()).toHaveLength(3);
  });
});

describe("findProject", () => {
  test("存在するプロジェクトを返す", async ({ expect }) => {
    // 準備
    const { findProject } = await freshProjects();

    // 実行
    const result = await findProject("apollo");

    // 検証
    expect(result?.name).toBe("Apollo");
  });

  test("存在しないプロジェクトは undefined を返す", async ({ expect }) => {
    // 準備
    const { findProject } = await freshProjects();

    // 実行と検証
    expect(await findProject("unknown")).toBeUndefined();
  });
});

describe("createProject", () => {
  test("名前からスラッグを作って追加する", async ({ expect }) => {
    // 準備
    const { createProject, findProject } = await freshProjects();

    // 実行
    const created = await createProject("New Project", "説明");

    // 検証
    expect(created.id).toBe("new-project");
    expect(created.name).toBe("New Project");
    expect(await findProject("new-project")).toStrictEqual(created);
  });

  test("空名は時刻ベースの id になる", async ({ expect }) => {
    // 準備
    const { createProject } = await freshProjects();

    // 実行
    const created = await createProject("---", "説明");

    // 検証
    expect(created.id.startsWith("project-")).toBe(true);
  });

  test("重複名は連番を付ける", async ({ expect }) => {
    // 準備
    const { createProject } = await freshProjects();
    await createProject("Dupe", "説明");

    // 実行
    const second = await createProject("Dupe", "説明その2");

    // 検証
    expect(second.id).toBe("dupe-2");
  });

  test("保存失敗でもメモリー上の作成は維持する", async ({ expect }) => {
    // 準備
    stubStorage({
      set: () => {
        throw new Error("locked");
      },
    });
    const { createProject, findProject } = await freshProjects();

    // 実行
    const created = await createProject("Resilient", "説明");

    // 検証
    expect((await findProject(created.id))?.name).toBe("Resilient");
  });
});

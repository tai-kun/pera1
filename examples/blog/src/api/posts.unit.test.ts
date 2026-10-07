import { describe, test } from "vitest";

import { findPost, listPosts, listPostsByCategory, PAGE_SIZE, searchPosts } from "./posts.js";

describe("listPosts", () => {
  test("全記事を返す", async ({ expect }) => {
    // 実行
    const result = await listPosts();

    // 検証
    expect(result).toHaveLength(10);
  });
});

describe("findPost", () => {
  test("存在する記事を返す", async ({ expect }) => {
    // 実行
    const result = await findPost("1");

    // 検証
    expect(result?.title).toBe("React 入門");
  });

  test("存在しない記事は undefined を返す", async ({ expect }) => {
    // 実行と検証
    expect(await findPost("unknown")).toBeUndefined();
  });
});

describe("listPostsByCategory", () => {
  test("該当カテゴリーの記事だけ返す", async ({ expect }) => {
    // 実行
    const result = await listPostsByCategory("react");

    // 検証
    expect(result).toHaveLength(4);
    expect(result.every((post) => post.category === "react")).toBe(true);
  });

  test("該当なしは空配列を返す", async ({ expect }) => {
    // 実行と検証
    expect(await listPostsByCategory("unknown")).toStrictEqual([]);
  });
});

describe("searchPosts", () => {
  test("空文字では全件の1ページ目を返す", async ({ expect }) => {
    // 実行
    const result = await searchPosts("", 1);

    // 検証
    expect(result.q).toBe("");
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(PAGE_SIZE);
    expect(result.total).toBe(10);
    expect(result.totalPages).toBe(4);
    expect(result.posts).toHaveLength(3);
  });

  test("タイトル・本文・カテゴリーで絞り込む", async ({ expect }) => {
    // 実行と検証
    expect((await searchPosts("Suspense", 1)).posts.map((post) => post.id)).toStrictEqual(["7"]);
    expect((await searchPosts("TypeScript", 1)).total).toBe(3);
    expect((await searchPosts("css", 1)).total).toBe(3);
  });

  test("前後の空白を無視する", async ({ expect }) => {
    // 実行
    const result = await searchPosts("  React  ", 1);

    // 検証
    expect(result.q).toBe("React");
    expect(result.total).toBe(6);
  });

  test("不正なページは1ページ目に倒す", async ({ expect }) => {
    // 実行と検証
    expect((await searchPosts("", 0)).page).toBe(1);
    expect((await searchPosts("", -2)).page).toBe(1);
    expect((await searchPosts("", 1.5)).page).toBe(1);
  });

  test("最終ページを超えると最終ページに倒す", async ({ expect }) => {
    // 実行
    const result = await searchPosts("", 99);

    // 検証
    expect(result.page).toBe(4);
    expect(result.posts).toHaveLength(1);
  });

  test("2ページ目を切り出す", async ({ expect }) => {
    // 実行
    const result = await searchPosts("", 2);

    // 検証
    expect(result.page).toBe(2);
    expect(result.posts.map((post) => post.id)).toStrictEqual(["4", "5", "6"]);
  });
});

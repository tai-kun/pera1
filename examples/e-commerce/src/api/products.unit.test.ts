import { describe, test } from "vitest";

import {
  CATEGORIES,
  findProduct,
  listCategories,
  listProducts,
  listProductsByCategory,
} from "./products.js";

describe("listProducts", () => {
  test("全件の1ページ目を返す", async ({ expect }) => {
    // 実行
    const result = await listProducts({ category: "", sort: "", page: 1 });

    // 検証
    expect(result.total).toBeGreaterThan(0);
    expect(result.page).toBe(1);
    expect(result.sort).toBe("");
    expect(result.categories).toStrictEqual(CATEGORIES);
  });

  test("カテゴリーで絞り込む", async ({ expect }) => {
    // 実行
    const result = await listProducts({ category: "books", sort: "", page: 1 });

    // 検証
    expect(result.total).toBeGreaterThan(0);
    expect(result.products.every((product) => product.category === "books")).toBe(true);
  });

  test("価格順に並べる", async ({ expect }) => {
    // 実行
    const result = await listProducts({ category: "", sort: "price", page: 1 });

    // 検証
    const prices = result.products.map((product) => product.price);
    expect([...prices].sort((a, b) => a - b)).toStrictEqual(prices);
  });

  test("名前順に並べる", async ({ expect }) => {
    // 実行
    const result = await listProducts({ category: "", sort: "name", page: 1 });

    // 検証
    const names = result.products.map((product) => product.name);
    expect([...names].sort((a, b) => a.localeCompare(b))).toStrictEqual(names);
  });

  test("不正なソートは無視する", async ({ expect }) => {
    // 実行
    const result = await listProducts({ category: "", sort: "unknown", page: 1 });

    // 検証
    expect(result.sort).toBe("");
  });

  test("不正なページは1ページ目に倒す", async ({ expect }) => {
    // 実行と検証
    expect((await listProducts({ category: "", sort: "", page: 0 })).page).toBe(1);
    expect((await listProducts({ category: "", sort: "", page: -1 })).page).toBe(1);
  });

  test("最終ページを超えると最終ページに倒す", async ({ expect }) => {
    // 実行
    const result = await listProducts({ category: "", sort: "", page: 99 });

    // 検証
    expect(result.page).toBe(result.totalPages);
  });
});

describe("findProduct", () => {
  test("存在する商品を返す", async ({ expect }) => {
    // 実行
    const result = await findProduct("p1");

    // 検証
    expect(result?.name).toBe("TypeScript Handbook");
  });

  test("存在しない商品は undefined を返す", async ({ expect }) => {
    // 実行と検証
    expect(await findProduct("unknown")).toBeUndefined();
  });
});

describe("listProductsByCategory", () => {
  test("該当カテゴリーの商品だけ返す", async ({ expect }) => {
    // 実行
    const result = await listProductsByCategory("books");

    // 検証
    expect(result.length).toBeGreaterThan(0);
    expect(result.every((product) => product.category === "books")).toBe(true);
  });

  test("該当なしは空配列を返す", async ({ expect }) => {
    // 実行と検証
    expect(await listProductsByCategory("unknown")).toStrictEqual([]);
  });
});

describe("listCategories", () => {
  test("全カテゴリーを返す", async ({ expect }) => {
    // 実行と検証
    expect(await listCategories()).toStrictEqual(["books", "electronics", "clothing"]);
  });
});

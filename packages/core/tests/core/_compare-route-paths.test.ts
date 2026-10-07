import { describe, test } from "vitest";

import compareRoutePaths from "../../src/core/_compare-route-paths.js";

describe("単一セグメントにおける優先順位スコア基準の検証", () => {
  test("静的セグメントと接尾辞付きパラメーターを比較したとき、静的セグメントの優先度が高いため負の数になる", ({
    expect,
  }) => {
    // 準備
    const pathA = "/foo";
    const pathB = "/:title.mp4";

    // 実行
    const result = compareRoutePaths(pathA, pathB);

    // 検証
    expect(result).toBeLessThan(0);
  });

  test("接尾辞付きパラメーターと通常パラメーターを比較したとき、接尾辞付きパラメーターの優先度が高いため負の数になる", ({
    expect,
  }) => {
    // 準備
    const pathA = "/:title.mp4";
    const pathB = "/:title";

    // 実行
    const result = compareRoutePaths(pathA, pathB);

    // 検証
    expect(result).toBeLessThan(0);
  });

  test("通常パラメーターとオプショナルパラメーターを比較したとき、通常パラメーターの優先度が高いため負の数になる", ({
    expect,
  }) => {
    // 準備
    const pathA = "/:title";
    const pathB = "/:title?";

    // 実行
    const result = compareRoutePaths(pathA, pathB);

    // 検証
    expect(result).toBeLessThan(0);
  });

  test("オプショナルパラメーターとワイルドカードを比較したとき、オプショナルパラメーターの優先度が高いため負の数になる", ({
    expect,
  }) => {
    // 準備
    const pathA = "/:title?";
    const pathB = "/*";

    // 実行
    const result = compareRoutePaths(pathA, pathB);

    // 検証
    expect(result).toBeLessThan(0);
  });

  test("ワイルドカードとオプショナルワイルドカードを比較したとき、ワイルドカードの優先度が高いため負の数になる", ({
    expect,
  }) => {
    // 準備
    const pathA = "/*";
    const pathB = "/*?";

    // 実行
    const result = compareRoutePaths(pathA, pathB);

    // 検証
    expect(result).toBeLessThan(0);
  });
});

describe("優先順位比較の検証", () => {
  test("同一のパスを比較したとき、等価であることを示す 0 になる", ({ expect }) => {
    // 準備
    const pathA = "/foo/bar";
    const pathB = "/foo/bar";

    // 実行
    const result = compareRoutePaths(pathA, pathB);

    // 検証
    expect(result).toBe(0);
  });

  test("末尾や先頭のスラッシュの有無が異なる同一のパスを比較したとき、スラッシュが無視されて等価であることを示す 0 になる", ({
    expect,
  }) => {
    // 準備
    const pathA = "foo/bar";
    const pathB = "/foo/bar/";

    // 実行
    const result = compareRoutePaths(pathA, pathB);

    // 検証
    expect(result).toBe(0);
  });
});

describe("境界値および特殊ケースの検証", () => {
  test("両方ともルートパスであるとき、等価であることを示す 0 になる", ({ expect }) => {
    // 準備
    const pathA = "/";
    const pathB = "/";

    // 実行
    const result = compareRoutePaths(pathA, pathB);

    // 検証
    expect(result).toBe(0);
  });

  test("ルートパスと通常のパスを比較したとき、ルートパスであるパス A が先に終了するためパス B が優先されて正の数になる", ({
    expect,
  }) => {
    // 準備
    const pathA = "/";
    const pathB = "/foo";

    // 実行
    const result = compareRoutePaths(pathA, pathB);

    // 検証
    expect(result).toBeGreaterThan(0);
  });

  test("連続するスラッシュが含まれるパスと通常のパスを比較したとき、空のセグメントが除外されて等価であることを示す 0 になる", ({
    expect,
  }) => {
    // 準備
    const pathA = "//foo";
    const pathB = "/foo";

    // 実行
    const result = compareRoutePaths(pathA, pathB);

    // 検証
    expect(result).toBe(0);
  });

  test("パラメーター記号のみのセグメントと接尾辞付きパラメーターを比較したとき、接尾辞付きパラメーターが優先されるため正の数になる", ({
    expect,
  }) => {
    // 準備
    const pathA = "/:";
    const pathB = "/:title.mp4";

    // 実行
    const result = compareRoutePaths(pathA, pathB);

    // 検証
    expect(result).toBeGreaterThan(0);
  });

  test("パラメーター記号のみのセグメントとオプショナルパラメーターを比較したとき、パラメーター記号のみのセグメントが優先されるため負の数になる", ({
    expect,
  }) => {
    // 準備
    const pathA = "/:";
    const pathB = "/:title?";

    // 実行
    const result = compareRoutePaths(pathA, pathB);

    // 検証
    expect(result).toBeLessThan(0);
  });

  test("接尾辞とオプショナル記号が混在するセグメントと通常パラメーターを比較したとき、通常パラメーターが優先されるため正の数になる", ({
    expect,
  }) => {
    // 準備
    const pathA = "/:title.mp4?";
    const pathB = "/:title";

    // 実行
    const result = compareRoutePaths(pathA, pathB);

    // 検証
    expect(result).toBeGreaterThan(0);
  });

  test("接尾辞とオプショナル記号が混在するセグメントとワイルドカードを比較したとき、接尾辞とオプショナル記号が混在するセグメントが優先されるため負の数になる", ({
    expect,
  }) => {
    // 準備
    const pathA = "/:title.mp4?";
    const pathB = "/*";

    // 実行
    const result = compareRoutePaths(pathA, pathB);

    // 検証
    expect(result).toBeLessThan(0);
  });

  test("ドットが先頭にあるパラメーターセグメントと静的セグメントを比較したとき、静的セグメントが優先されるため正の数になる", ({
    expect,
  }) => {
    // 準備
    const pathA = "/:.foo";
    const pathB = "/foo";

    // 実行
    const result = compareRoutePaths(pathA, pathB);

    // 検証
    expect(result).toBeGreaterThan(0);
  });

  test("ドットが先頭にあるパラメーターセグメントと通常パラメーターを比較したとき、ドットが先頭にあるパラメーターセグメントが優先されるため負の数になる", ({
    expect,
  }) => {
    // 準備
    const pathA = "/:.foo";
    const pathB = "/:title";

    // 実行
    const result = compareRoutePaths(pathA, pathB);

    // 検証
    expect(result).toBeLessThan(0);
  });

  test("ワイルドカード記号を含む特殊な静的文字列セグメントと通常パラメーターを比較したとき、静的文字列セグメントが優先されるため負の数になる", ({
    expect,
  }) => {
    // 準備
    const pathA = "/a*b";
    const pathB = "/:title";

    // 実行
    const result = compareRoutePaths(pathA, pathB);

    // 検証
    expect(result).toBeLessThan(0);
  });
});

describe("Array.prototype.sort に組み込んだ結合テスト", () => {
  test("異種 Segment が混在する配列を sort したとき、詳細度 Score に基づき期待される優先順位に並び替えられる", ({
    expect,
  }) => {
    // 準備
    const routes = [
      "/*",
      "/books/:title",
      "/books/featured",
      "/books/:title.epub",
      "/books/:title?",
    ];

    // 実行
    routes.sort(compareRoutePaths);

    // 検証
    expect(routes).toStrictEqual([
      "/books/featured",
      "/books/:title.epub",
      "/books/:title",
      "/books/:title?",
      "/*",
    ]);
  });

  test("同一 Score で階層の深さや辞書順が異なる配列を sort したとき、階層の深さと辞書順の規則に基づき期待される優先順位に並び替えられる", ({
    expect,
  }) => {
    // 準備
    const routes = [
      "/users/:id/profile",
      "/users",
      "/users/:id",
      "/users/v2",
      "/users/v1",
      "/users/v0",
    ];

    // 実行
    routes.sort(compareRoutePaths);

    // 検証
    expect(routes).toStrictEqual([
      "/users/v0",
      "/users/v1",
      "/users/v2",
      "/users/:id/profile",
      "/users/:id",
      "/users",
    ]);
  });
});

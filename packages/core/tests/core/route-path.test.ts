import { describe, test } from "vitest";

import RoutePath from "../../src/core/route-path.js";

describe("コンストラクターおよび初期化（文字列入力）", () => {
  test("空文字列で初期化した場合ルートパスになる", ({ expect }) => {
    // 準備
    const path = "";

    // 実行
    const routePath = new RoutePath(path);

    // 検証
    expect(routePath.toString()).toBe("/");
  });

  test("スラッシュのみで初期化した場合ルートパスが維持される", ({ expect }) => {
    // 準備
    const path = "/";

    // 実行
    const routePath = new RoutePath(path);

    // 検証
    expect(routePath.toString()).toBe("/");
  });

  test("標準的なパス文字列で初期化した場合そのまま維持される", ({ expect }) => {
    // 準備
    const path = "/users/profile";

    // 実行
    const routePath = new RoutePath(path);

    // 検証
    expect(routePath.toString()).toBe("/users/profile");
  });

  test("先頭にスラッシュがない文字列で初期化した場合先頭にスラッシュが付与される", ({ expect }) => {
    // 準備
    const path = "users/profile";

    // 実行
    const routePath = new RoutePath(path);

    // 検証
    expect(routePath.toString()).toBe("/users/profile");
  });

  test("連続するスラッシュを含む文字列で初期化した場合重複が排除される", ({ expect }) => {
    // 準備
    const path = "/users///profile//settings";

    // 実行
    const routePath = new RoutePath(path);

    // 検証
    expect(routePath.toString()).toBe("/users/profile/settings");
  });

  test("末尾にスラッシュがある文字列で初期化した場合末尾のスラッシュが削除される", ({ expect }) => {
    // 準備
    const path = "/users/";

    // 実行
    const routePath = new RoutePath(path);

    // 検証
    expect(routePath.toString()).toBe("/users");
  });

  test("末尾に連続するスラッシュがある文字列で初期化した場合末尾のスラッシュがすべて削除される", ({
    expect,
  }) => {
    // 準備
    const path = "/users///";

    // 実行
    const routePath = new RoutePath(path);

    // 検証
    expect(routePath.toString()).toBe("/users");
  });

  test("クエリーおよびハッシュ付き文字列で初期化した場合クエリーが自動でソートされる", ({
    expect,
  }) => {
    // 準備
    const path = "/page?b=2&a=1#section";

    // 実行
    const routePath = new RoutePath(path);

    // 検証
    expect(routePath.toString()).toBe("/page?a=1&b=2#section");
  });
});

describe("コンストラクターおよび初期化（オブジェクト入力）", () => {
  test("標準的なオブジェクトで初期化した場合正しいパス文字列になる", ({ expect }) => {
    // 準備
    const pathObj = { pathname: "users", search: "?id=10", hash: "#top" };

    // 実行
    const routePath = new RoutePath(pathObj);

    // 検証
    expect(routePath.toString()).toBe("/users?id=10#top");
  });

  test("オブジェクトのパス名に重複するスラッシュが含まれる場合正規化される", ({ expect }) => {
    // 準備
    const pathObj = { pathname: "///users//", search: "", hash: "" };

    // 実行
    const routePath = new RoutePath(pathObj);

    // 検証
    expect(routePath.toString()).toBe("/users");
  });

  test("オブジェクトに順不同のクエリーが含まれる場合自動でソートされる", ({ expect }) => {
    // 準備
    const pathObj = { pathname: "/search", search: "?z=1&m=2&a=3", hash: "" };

    // 実行
    const routePath = new RoutePath(pathObj);

    // 検証
    expect(routePath.toString()).toBe("/search?a=3&m=2&z=1");
  });
});

describe("静的メソッド（encode）の検証", () => {
  test("文字列を encode メソッドに渡した場合正規化された文字列が返る", ({ expect }) => {
    // 準備
    const path = "//items//123//";

    // 実行
    const result = RoutePath.encode(path);

    // 検証
    expect(result).toBe("/items/123");
  });

  test("オブジェクトを encode メソッドに渡した場合正規化された文字列が返る", ({ expect }) => {
    // 準備
    const pathObj = { pathname: "/a/", search: "?q=test", hash: "#h" };

    // 実行
    const result = RoutePath.encode(pathObj);

    // 検証
    expect(result).toBe("/a?q=test#h");
  });
});

describe("プロパティーの操作（ゲッターおよびセッター）", () => {
  test("pathname に末尾スラッシュを含む文字列を代入すると正規化されて保持される", ({ expect }) => {
    // 準備
    const routePath = new RoutePath("/old");

    // 実行
    routePath.pathname = "/new/";

    // 検証
    expect(routePath.toString()).toBe("/new");
  });

  test("search プロパティーに順不同のクエリーを代入すると自動でソートされて保持される", ({
    expect,
  }) => {
    // 準備
    const routePath = new RoutePath("");

    // 実行
    routePath.search = "?c=3&b=2&a=1";

    // 検証
    expect(routePath.search).toBe("?a=1&b=2&c=3");
  });

  test("searchParams のメソッドで値を追加すると search および全体文字列に反映される", ({
    expect,
  }) => {
    // 準備
    const routePath = new RoutePath("/test?a=1");

    // 実行
    routePath.searchParams.append("x", "9");

    // 検証
    expect(routePath.search).toBe("?a=1&x=9");
    expect(routePath.toString()).toBe("/test?a=1&x=9");
  });

  test("hash プロパティーに先頭記号なしの文字列を代入すると先頭にハッシュ記号が付与される", ({
    expect,
  }) => {
    // 準備
    const routePath = new RoutePath("");

    // 実行
    routePath.hash = "heading1";

    // 検証
    expect(routePath.hash).toBe("#heading1");
  });
});

describe("境界値および特殊ケース", () => {
  test("引数なしで初期化した場合ルートパスになる", ({ expect }) => {
    // 準備（引数なし）
    // 実行
    const routePath = new RoutePath();

    // 検証
    expect(routePath.toString()).toBe("/");
  });

  test("大量のスラッシュのみを入力した場合ルートパスに正規化される", ({ expect }) => {
    // 準備
    const path = "////////////";

    // 実行
    const routePath = new RoutePath(path);

    // 検証
    expect(routePath.toString()).toBe("/");
  });

  test("特殊文字を含むパス名を入力した場合、エンコードされる", ({ expect }) => {
    // 準備
    const path = "/path/単語/&%$";

    // 実行
    const routePath = new RoutePath(path);

    // 検証
    expect(routePath.toString()).toBe("/path/%E5%8D%98%E8%AA%9E/&%$");
  });

  test("未エンコードのみの特殊文字エンコードする", ({ expect }) => {
    // 準備
    const path = "/path/%E5%8D%98%E8%AA%9E/単語";

    // 実行
    const routePath = new RoutePath(path);

    // 検証
    expect(routePath.toString()).toBe("/path/%E5%8D%98%E8%AA%9E/%E5%8D%98%E8%AA%9E");
  });

  test("クエリーおよびハッシュが記号のみのオブジェクトで初期化した場合不要な記号が除去される", ({
    expect,
  }) => {
    // 準備
    const pathObj = { pathname: "/p", search: "?", hash: "#" };

    // 実行
    const routePath = new RoutePath(pathObj);

    // 検証
    expect(routePath.toString()).toBe("/p");
  });

  test("URL形式の文字列を入力した場合ホスト名部分もパスの一部として取り込まれる", ({ expect }) => {
    // 準備
    const path = "http://google.com/path";

    // 実行
    const routePath = new RoutePath(path);

    // 検証
    expect(routePath.toString()).toBe("/http:/google.com/path");
  });
});

describe("RoutePath のエッジケース", () => {
  test("エンコードされたスラッシュは保持される", ({ expect }) => {
    // 準備と実行
    const path = new RoutePath("/a%2Fb/c");

    // 検証
    expect(path.pathname).toBe("/a%2Fb/c");
  });

  test("clone は独立したコピーを返す", ({ expect }) => {
    // 準備
    const path = new RoutePath("/a?b=1#h");

    // 実行
    const cloned = path.clone();

    // 検証
    expect(cloned.toString()).toBe(path.toString());
    cloned.pathname = "/b";
    expect(path.pathname).toBe("/a");
    expect(cloned.pathname).toBe("/b");
  });

  test("search に ? なしの値を渡すと ? が付与される", ({ expect }) => {
    // 準備
    const path = new RoutePath("/a");

    // 実行
    path.search = "x=1";

    // 検証
    expect(path.search).toBe("?x=1");
  });

  test("空の hash は除去される", ({ expect }) => {
    // 準備
    const path = new RoutePath("/a#hash");

    // 実行
    path.hash = "";

    // 検証
    expect(path.hash).toBe("");
    expect(path.toString()).toBe("/a");
  });

  test("searchParams 追加後に search が反映される", ({ expect }) => {
    // 準備
    const path = new RoutePath("/a?z=1&a=2");

    // 検証
    expect(path.search).toBe("?a=2&z=1");
    path.searchParams.append("m", "3");
    expect(path.search).toBe("?a=2&m=3&z=1");
  });

  test("pathname への代入でスラッシュが正規化される", ({ expect }) => {
    // 準備
    const path = new RoutePath("/a");

    // 実行
    path.pathname = "//b///c//";

    // 検証
    expect(path.pathname).toBe("/b/c");
  });

  test("非常に長いパスでも末尾が保持される", ({ expect }) => {
    // 準備
    const long = "/" + "a/".repeat(500) + "end";

    // 実行
    const path = new RoutePath(long);

    // 検証
    expect(path.pathname.endsWith("/end")).toBe(true);
  });

  test("Unicode を含むパスはエンコードされる", ({ expect }) => {
    // 準備と実行
    const path = new RoutePath("/日本語/パス");

    // 検証
    expect(path.pathname).toBe("/%E6%97%A5%E6%9C%AC%E8%AA%9E/%E3%83%91%E3%82%B9");
  });

  test("空の pathname は / になる", ({ expect }) => {
    // 準備と実行
    const path = new RoutePath({ pathname: "", search: "", hash: "" });

    // 検証
    expect(path.pathname).toBe("/");
  });
});

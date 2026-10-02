import { describe, test } from "vitest";

import { RoutePatternMismatchError } from "../../src/core/errors.js";
import RoutePatternUtils from "../../src/core/route-pattern-utils.js";

describe("インスタンス生成", () => {
  test("有効なルートパターンを渡したとき、正しくプロパティーが初期化される", ({ expect }) => {
    // 準備
    const routePattern = "/users/:id";

    // 実行
    const utils = new RoutePatternUtils(routePattern);

    // 検証
    expect(utils.route).toBe(routePattern);
    expect(utils.pattern).toBeInstanceOf(RegExp);
    expect(utils.paramKeys).toStrictEqual(["id"]);
  });
});

describe("match メソッド", () => {
  test("対象のパスがルートパターンに一致するとき、true を返す", ({ expect }) => {
    // 準備
    const utils = new RoutePatternUtils("/users/:id");
    const target = "/users/123";

    // 実行
    const result = utils.match(target);

    // 検証
    expect(result).toBe(true);
  });

  test("対象のパスがルートパターンに一致しないとき、false を返す", ({ expect }) => {
    // 準備
    const utils = new RoutePatternUtils("/users/:id");
    const target = "/posts/123";

    // 実行
    const result = utils.match(target);

    // 検証
    expect(result).toBe(false);
  });

  test("RoutePatternMatchURL 型のオブジェクトが渡されたとき、pathname を用いて正しく判定する", ({
    expect,
  }) => {
    // 準備
    const utils = new RoutePatternUtils("/users/:id");
    const target = { pathname: "/users/123" };

    // 実行
    const result = utils.match(target);

    // 検証
    expect(result).toBe(true);
  });

  test("allowChild オプションを true にしたとき、下位パスが存在する場合にも一致とみなす", ({
    expect,
  }) => {
    // 準備
    const utils = new RoutePatternUtils("/users/:id", { allowChild: true });
    const target = "/users/123/posts/456";

    // 実行
    const result = utils.match(target);

    // 検証
    expect(result).toBe(true);
  });
});

describe("parseSafe メソッド", () => {
  test("対象のパスがルートパターンに一致するとき、抽出されたパラメーターオブジェクトを返す", ({
    expect,
  }) => {
    // 準備
    const utils = new RoutePatternUtils("/users/:id/posts/:postId");
    const target = "/users/123/posts/456";

    // 実行
    const result = utils.parseSafe(target);

    // 検証
    expect(result).toStrictEqual({ id: "123", postId: "456" });
  });

  test("対象のパスがルートパターンに一致しないとき、null を返す", ({ expect }) => {
    // 準備
    const utils = new RoutePatternUtils("/users/:id");
    const target = "/posts/123";

    // 実行
    const result = utils.parseSafe(target);

    // 検証
    expect(result).toBe(null);
  });
});

describe("parse メソッド", () => {
  test("対象のパスがルートパターンに一致するとき、抽出されたパラメーターオブジェクトを返す", ({
    expect,
  }) => {
    // 準備
    const utils = new RoutePatternUtils("/users/:id");
    const target = "/users/123";

    // 実行
    const result = utils.parse(target);

    // 検証
    expect(result).toStrictEqual({ id: "123" });
  });

  test("対象のパスがルートパターンに一致しないとき、RoutePatternMismatchError を投げる", ({
    expect,
  }) => {
    // 準備
    const utils = new RoutePatternUtils("/users/:id");
    const target = "/posts/123";

    // 実行と検証
    expect(() => utils.parse(target)).toThrow(RoutePatternMismatchError);
  });
});

describe("inject メソッド", () => {
  test("指定されたパラメーターをルートパターンに埋め込み、パス文字列を構築する", ({ expect }) => {
    // 準備
    const utils = new RoutePatternUtils("/users/:id/posts/:postId");
    const params = { id: "123", postId: "456" };

    // 実行
    const result = utils.inject(params);

    // 検証
    expect(result).toBe("/users/123/posts/456");
  });
});

describe("replaceSafe メソッド", () => {
  test("対象のパスが一致するとき、一部のパラメーターを指定された値で上書きしたパスを構築する", ({
    expect,
  }) => {
    // 準備
    const utils = new RoutePatternUtils("/users/:id/posts/:postId");
    const target = "/users/123/posts/456";
    const params = { postId: "789" };

    // 実行
    const result = utils.replaceSafe(target, params);

    // 検証
    expect(result).toBe("/users/123/posts/789");
  });

  test("対象のパスが一致しないとき、null を返す", ({ expect }) => {
    // 準備
    const utils = new RoutePatternUtils("/users/:id");
    const target = "/posts/123";
    const params = { id: "456" };

    // 実行
    const result = utils.replaceSafe(target, params);

    // 検証
    expect(result).toBe(null);
  });
});

describe("replace メソッド", () => {
  test("対象のパスが一致するとき、一部のパラメーターを指定された値で上書きしたパスを構築する", ({
    expect,
  }) => {
    // 準備
    const utils = new RoutePatternUtils("/users/:id/posts/:postId");
    const target = "/users/123/posts/456";
    const params = { postId: "789" };

    // 実行
    const result = utils.replace(target, params);

    // 検証
    expect(result).toBe("/users/123/posts/789");
  });

  test("対象のパスが一致しないとき、RoutePatternMismatchError を投げる", ({ expect }) => {
    // 準備
    const utils = new RoutePatternUtils("/users/:id");
    const target = "/posts/123";
    const params = { id: "456" };

    // 実行と検証
    expect(() => utils.replace(target, params)).toThrow(RoutePatternMismatchError);
  });
});

describe("静的メソッド", () => {
  test("match 静的メソッドを実行したとき、正しく一致判定が行われる", ({ expect }) => {
    // 準備
    const routePattern = "/users/:id";
    const target = "/users/123";
    const options = {};

    // 実行
    const result = RoutePatternUtils.match(routePattern, target, options);

    // 検証
    expect(result).toBe(true);
  });

  test("parse 静的メソッドを実行したとき、正しくパラメーターが抽出される", ({ expect }) => {
    // 準備
    const routePattern = "/users/:id";
    const target = "/users/123";
    const options = {};

    // 実行
    const result = RoutePatternUtils.parse(routePattern, target, options);

    // 検証
    expect(result).toStrictEqual({ id: "123" });
  });

  test("parseSafe 静的メソッドを実行したとき、正しくパラメーターが抽出される", ({ expect }) => {
    // 準備
    const routePattern = "/users/:id";
    const target = "/users/123";
    const options = {};

    // 実行
    const result = RoutePatternUtils.parseSafe(routePattern, target, options);

    // 検証
    expect(result).toStrictEqual({ id: "123" });
  });

  test("inject 静的メソッドを実行したとき、正しくパスが生成される", ({ expect }) => {
    // 準備
    const routePattern = "/users/:id";
    const params = { id: "123" };
    const options = {};

    // 実行
    const result = RoutePatternUtils.inject(routePattern, params, options);

    // 検証
    expect(result).toBe("/users/123");
  });

  test("replace 静的メソッドを実行したとき、正しくパスが置換生成される", ({ expect }) => {
    // 準備
    const routePattern = "/users/:id/posts/:postId";
    const target = "/users/123/posts/456";
    const params = { postId: "789" };
    const options = {};

    // 実行
    const result = RoutePatternUtils.replace(routePattern, target, params, options);

    // 検証
    expect(result).toBe("/users/123/posts/789");
  });

  test("replaceSafe 静的メソッドを実行したとき、正しくパスが置換生成される", ({ expect }) => {
    // 準備
    const routePattern = "/users/:id/posts/:postId";
    const target = "/users/123/posts/456";
    const params = { postId: "789" };
    const options = {};

    // 実行
    const result = RoutePatternUtils.replaceSafe(routePattern, target, params, options);

    // 検証
    expect(result).toBe("/users/123/posts/789");
  });
});

describe("RoutePatternUtils の拡張的な一致", () => {
  test("wildcard は子パス全体にマッチする", ({ expect }) => {
    // 準備
    const utils = new RoutePatternUtils("/files/*");

    // 実行と検証
    expect(utils.match("/files/a/b/c")).toBe(true);
    expect(utils.parseSafe("/files/a/b/c")).toStrictEqual({ "*": "a/b/c" });
    expect(utils.match("/files")).toBe(false);
  });

  test("optional wildcard は空にもマッチする", ({ expect }) => {
    // 準備
    const utils = new RoutePatternUtils("/files/*?");

    // 検証
    expect(utils.match("/files")).toBe(true);
    expect(utils.match("/files/a")).toBe(true);
  });

  test("optional param は省略できる", ({ expect }) => {
    // 準備
    const utils = new RoutePatternUtils("/users/:id?");

    // 検証
    expect(utils.match("/users")).toBe(true);
    expect(utils.match("/users/123")).toBe(true);
    expect(utils.parseSafe("/users")).toStrictEqual({});
    expect(utils.parseSafe("/users/123")).toStrictEqual({ id: "123" });
  });

  test("suffix 付き param は拡張子で区切られる", ({ expect }) => {
    // 準備
    const utils = new RoutePatternUtils("/movies/:title.mp4");

    // 検証
    expect(utils.match("/movies/foo.mp4")).toBe(true);
    expect(utils.match("/movies/foo.mov")).toBe(false);
    expect(utils.parseSafe("/movies/foo.mp4")).toStrictEqual({ title: "foo" });
  });

  test("inject で params を埋め込める", ({ expect }) => {
    // 準備
    const userUtils = new RoutePatternUtils("/users/:id");
    const fileUtils = new RoutePatternUtils("/files/*");

    // 検証
    expect(userUtils.inject({ id: "42" })).toBe("/users/42");
    expect(fileUtils.inject({ "*": "a/b" })).toBe("/files/a/b");
  });

  test("allowChild が true のとき親が子にマッチする", ({ expect }) => {
    // 準備
    const withChild = new RoutePatternUtils("/users", { allowChild: true });
    const withoutChild = new RoutePatternUtils("/users", { allowChild: false });

    // 検証
    expect(withChild.match("/users/123")).toBe(true);
    expect(withoutChild.match("/users/123")).toBe(false);
  });

  test("エンコードされた param はデコードされない", ({ expect }) => {
    // 準備
    const utils = new RoutePatternUtils("/users/:id");

    // 検証
    expect(utils.parseSafe("/users/%20hello")).toStrictEqual({ id: "%20hello" });
  });

  test("末尾スラッシュは正規化される", ({ expect }) => {
    // 準備
    const utils = new RoutePatternUtils("/users/:id");

    // 検証
    expect(utils.match("/users/123/")).toBe(true);
    expect(utils.match("/users/123")).toBe(true);
  });

  test("replace で一部 param を置換できる", ({ expect }) => {
    // 準備
    const utils = new RoutePatternUtils("/users/:id/posts/:postId");

    // 検証
    expect(utils.replace("/users/1/posts/2", { postId: "99" })).toBe("/users/1/posts/99");
    expect(utils.replaceSafe("/invalid", { postId: "1" })).toBeNull();
  });

  test("一致しない parse はエラーを投げる", ({ expect }) => {
    // 準備
    const utils = new RoutePatternUtils("/users/:id");

    // 実行と検証
    expect(() => utils.parse("/other/123")).toThrow();
  });

  test("静的ヘルパーはインスタンスと同等", ({ expect }) => {
    // 検証
    expect(RoutePatternUtils.match("/a/:id", "/a/1")).toBe(true);
    expect(RoutePatternUtils.parse("/a/:id", "/a/1")).toStrictEqual({ id: "1" });
    expect(RoutePatternUtils.inject("/a/:id", { id: "1" })).toBe("/a/1");
    expect(RoutePatternUtils.parseSafe("/a/:id", "/no")).toBeNull();
  });

  test("Unicode を含む param はエンコードされる", ({ expect }) => {
    // 準備
    const utils = new RoutePatternUtils("/users/:name");

    // 検証
    expect(utils.parseSafe("/users/日本語")).toStrictEqual({ name: "%E6%97%A5%E6%9C%AC%E8%AA%9E" });
    expect(utils.inject({ name: "日本語" })).toBe("/users/日本語");
  });
});

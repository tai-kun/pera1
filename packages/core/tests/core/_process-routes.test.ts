import { describe, test } from "vitest";

import processRoutes from "../../src/core/_process-routes.js";
import type { RouteDefinition, ShouldReloadFunctionArgs } from "../../src/core/route.types.js";

describe("空の配列が入力された場合", () => {
  test("空の配列を返す", ({ expect }) => {
    // 準備
    const routes: RouteDefinition[] = [];

    // 実行
    const result = processRoutes(routes);

    // 検証
    expect(result).toStrictEqual([]);
  });
});

describe("index プロパティーが指定されている場合", () => {
  test("index が false のとき、マッピングされた Route オブジェクトを返す", ({ expect }) => {
    // 準備
    const action = () => {};
    const routes: RouteDefinition[] = [{ path: "/home", index: false, action }];

    // 実行
    const result = processRoutes(routes);

    // 検証
    expect(result[0]?.path).toBe("/home");
    expect(result[0]?.index).toStrictEqual(false);
    expect(result[0]?.action).toStrictEqual(action);
  });

  test("index が true のとき、マッピングされた Route オブジェクトを返す", ({ expect }) => {
    // 準備
    const routes: RouteDefinition[] = [{ path: "/", index: true }];

    // 実行
    const result = processRoutes(routes);

    // 検証
    expect(result[0]?.path).toBe("/");
    expect(result[0]?.index).toStrictEqual(true);
  });

  test("index が省略されたとき、false として扱われた Route オブジェクトを返す", ({ expect }) => {
    // 準備
    const routes: RouteDefinition[] = [{ path: "/about" }];

    // 実行
    const result = processRoutes(routes);

    // 検証
    expect(result[0]?.path).toBe("/about");
    expect(result[0]?.index).toStrictEqual(false);
  });
});

describe("component プロパティーの解決処理", () => {
  test("コンポーネントが関数形式のとき、そのまま関数が設定される", ({ expect }) => {
    // 準備
    const MyComponent = () => "MyComponent";
    const routes: RouteDefinition[] = [{ path: "/", component: MyComponent }];

    // 実行
    const result = processRoutes(routes);

    // 検証
    expect(result[0]?.component).toStrictEqual(MyComponent);
  });

  test("コンポーネントがモジュール形式のとき、default エクスポートの関数が設定される", ({
    expect,
  }) => {
    // 準備
    const MyComponent = () => "MyComponent";
    const routes: RouteDefinition[] = [
      {
        path: "/",
        [Symbol.toStringTag]: "Module",
        default: MyComponent,
      },
    ];

    // 実行
    const result = processRoutes(routes);

    // 検証
    expect(result[0]?.component).toStrictEqual(MyComponent);
  });
});

describe("shouldReload プロパティーの処理", () => {
  test("shouldReload が未定義のとき、既定の関数が設定され、引数の defaultShouldReload をそのまま返す", ({
    expect,
  }) => {
    // 準備
    const routes: RouteDefinition[] = [{ path: "/", shouldReload: undefined }];

    // 実行
    const result = processRoutes(routes);
    const shouldReloadFunc = result[0]?.shouldReload;

    // 検証
    expect(
      shouldReloadFunc?.({ defaultShouldReload: true } as unknown as ShouldReloadFunctionArgs),
    ).toStrictEqual(true);
    expect(
      shouldReloadFunc?.({ defaultShouldReload: false } as unknown as ShouldReloadFunctionArgs),
    ).toStrictEqual(false);
  });

  test("shouldReload がカスタム定義されているとき、ユーザー定義の関数が設定される", ({
    expect,
  }) => {
    // 準備
    const myCustomFunc = () => true;
    const routes: RouteDefinition[] = [{ path: "/", shouldReload: myCustomFunc }];

    // 実行
    const result = processRoutes(routes);

    // 検証
    expect(result[0]?.shouldReload).toStrictEqual(myCustomFunc);
  });
});

describe("ルートのソート処理", () => {
  test("詳細度の高い具体的なパスが前方にソートされる", ({ expect }) => {
    // 準備
    const routes: RouteDefinition[] = [{ path: "/user/:id" }, { path: "/user/profile" }];

    // 実行
    const result = processRoutes(routes);

    // 検証
    expect(result[0]?.path).toBe("/user/profile");
    expect(result[1]?.path).toBe("/user/:id");
  });

  test("同一優先度のパスが与えられたとき、名前順になる", ({ expect }) => {
    // 準備
    const routes: RouteDefinition[] = [{ path: "/page2" }, { path: "/page1" }];

    // 実行
    const result = processRoutes(routes);

    // 検証
    expect(result[0]?.path).toBe("/page1");
    expect(result[1]?.path).toBe("/page2");
  });
});

describe("パス名のエンコード処理", () => {
  test("パスに特殊文字が含まれるとき、エラーを投げずにエンコード処理が完了する", ({ expect }) => {
    // 準備
    const routes: RouteDefinition[] = [{ path: "/search/a&b/v1" }];

    // 実行
    const result = processRoutes(routes);

    // 検証
    // RoutePath.encode の仕様に依存するため、実行が完了しオブジェクトが返ることを検証する。
    expect(result[0]?.path).toBe("/search/a&b/v1");
  });
});

describe("例外系・エラーハンドリング", () => {
  test("引数に null を渡したとき、実行時エラーが発生する", ({ expect }) => {
    // 準備
    const routes = null as unknown as RouteDefinition[];

    // 実行と検証
    expect(() => processRoutes(routes)).toThrow();
  });

  test("引数に undefined を渡したとき、実行時エラーが発生する", ({ expect }) => {
    // 準備
    const routes = undefined as unknown as RouteDefinition[];

    // 実行と検証
    expect(() => processRoutes(routes)).toThrow();
  });
});

describe("processRoutes のエッジケース", () => {
  test("重複パスでも件数が保持される", ({ expect }) => {
    // 実行
    const routes = processRoutes([{ path: "/a" }, { path: "/a" }]);

    // 検証
    expect(routes.length).toBe(2);
    expect(routes[0]!.path).toBe("/a");
  });

  test("index ルートは子にマッチしない", ({ expect }) => {
    // 準備と実行
    const routes = processRoutes([{ path: "/parent", index: true }]);

    // 検証
    expect(routes[0]!.utils.match("/parent/child")).toBe(false);
    expect(routes[0]!.utils.match("/parent")).toBe(true);
  });

  test("非 index ルートは子にマッチする", ({ expect }) => {
    // 準備と実行
    const routes = processRoutes([{ path: "/parent" }]);

    // 検証
    expect(routes[0]!.utils.match("/parent/child")).toBe(true);
  });

  test("component がなくてもエラーにならない", ({ expect }) => {
    // 実行
    const routes = processRoutes([{ path: "/no-comp" }]);

    // 検証
    expect(routes[0]!.component).toBeUndefined();
  });

  test("loader と action が引き継がれる", ({ expect }) => {
    // 準備
    const loader = () => "data";
    const action = () => "act";

    // 実行
    const routes = processRoutes([{ path: "/a", loader, action }]);

    // 検証
    expect(routes[0]!.loader).toBe(loader);
    expect(routes[0]!.action).toBe(action);
  });
});

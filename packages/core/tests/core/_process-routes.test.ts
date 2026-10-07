import { describe, test, vi } from "vitest";

import log from "../../src/_logger.js";
import processRoutes from "../../src/core/_process-routes.js";
import matchRoutes from "../../src/core/match-routes.js";
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

  test("モジュール形式が名前空間の展開で渡されたとき、default エクスポートの関数が設定される", ({
    expect,
  }) => {
    // 準備
    const MyComponent = () => "MyComponent";
    const module = { default: MyComponent, loader: () => "loader" };
    const routes: RouteDefinition[] = [{ path: "/", ...module }];

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

describe("processRoutes のエッジケース", () => {
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

describe("children による明示的ネストの展開", () => {
  test("相対パスは親パスに結合される", ({ expect }) => {
    // 準備
    const routes: RouteDefinition[] = [
      {
        path: "/users/:username",
        children: [{ path: "followers" }, { path: "following" }],
      },
    ];

    // 実行
    const result = processRoutes(routes);
    const paths = result.map((r) => r.path).sort();

    // 検証
    expect(paths).toContain("/users/:username");
    expect(paths).toContain("/users/:username/followers");
    expect(paths).toContain("/users/:username/following");
  });

  test("子 path が '/' 始まりなら絶対パスとして扱われる", ({ expect }) => {
    // 準備
    const routes: RouteDefinition[] = [
      {
        path: "/parent",
        children: [{ path: "/absolute" }, { path: "relative" }],
      },
    ];

    // 実行
    const result = processRoutes(routes);
    const paths = result.map((r) => r.path);

    // 検証
    expect(paths).toContain("/absolute");
    expect(paths).toContain("/parent/relative");
    expect(paths).toContain("/parent");
  });

  test("index: true の子は path 省略時に親パスを継承する", ({ expect }) => {
    // 準備
    const Child = () => "child";
    const Parent = () => "parent";
    const routes: RouteDefinition[] = [
      {
        path: "/users/:username",
        component: Parent,
        children: [{ index: true, component: Child }],
      },
    ];

    // 実行
    const result = processRoutes(routes);

    // 検証
    expect(result.length).toBe(2);
    const indexRoute = result.find((r) => r.index === true);
    const layoutRoute = result.find((r) => r.index === false);
    expect(indexRoute?.path).toBe("/users/:username");
    expect(indexRoute?.component).toBe(Child);
    expect(layoutRoute?.path).toBe("/users/:username");
    expect(layoutRoute?.component).toBe(Parent);
    // index は完全一致のみ、レイアウトは前方一致する。
    expect(indexRoute?.utils.match("/users/tai-kun")).toBe(true);
    expect(indexRoute?.utils.match("/users/tai-kun/followers")).toBe(false);
    expect(layoutRoute?.utils.match("/users/tai-kun/followers")).toBe(true);
  });

  test("深いネストは再帰的に結合される", ({ expect }) => {
    // 準備
    const routes: RouteDefinition[] = [
      {
        path: "/",
        children: [
          {
            path: "posts",
            children: [{ path: ":postId" }],
          },
        ],
      },
    ];

    // 実行
    const result = processRoutes(routes);
    const paths = result.map((r) => r.path);

    // 検証
    expect(paths).toContain("/");
    expect(paths).toContain("/posts");
    expect(paths).toContain("/posts/:postId");
  });

  test("flat 定義と children 定義は混在できる", ({ expect }) => {
    // 準備
    const routes: RouteDefinition[] = [
      { path: "/flat" },
      {
        path: "/nested",
        children: [{ index: true }, { path: "child" }],
      },
    ];

    // 実行
    const result = processRoutes(routes);
    const paths = result.map((r) => r.path);

    // 検証
    expect(paths).toContain("/flat");
    expect(paths).toContain("/nested");
    expect(paths).toContain("/nested/child");
    expect(result.length).toBe(4);
  });

  test("children なしの flat 配列は従来通り動作する", ({ expect }) => {
    // 準備: children 記法と等価な flat 配列
    const flat: RouteDefinition[] = [
      { path: "/users/:username" },
      { path: "/users/:username", index: true },
      { path: "/users/:username/followers", index: true },
    ];
    const nested: RouteDefinition[] = [
      {
        path: "/users/:username",
        children: [{ index: true }, { path: "followers", index: true }],
      },
    ];

    // 実行
    const flatPaths = processRoutes(flat)
      .map((r) => `${r.path} index=${r.index}`)
      .sort();
    const nestedPaths = processRoutes(nested)
      .map((r) => `${r.path} index=${r.index}`)
      .sort();

    // 検証
    expect(nestedPaths).toStrictEqual(flatPaths);
  });

  test("path を省略したパスレスの子は親パスを継承する", ({ expect }) => {
    // 準備
    const routes: RouteDefinition[] = [
      {
        path: "/dashboard",
        children: [{ component: () => "layout-child" }],
      },
    ];

    // 実行
    const result = processRoutes(routes);

    // 検証
    expect(result.length).toBe(2);
    expect(result.every((r) => r.path === "/dashboard")).toBe(true);
  });

  test("index ルートが children を持つとき警告するが展開は継続する", ({ expect }) => {
    // 準備
    const spy = vi.spyOn(log, "warn").mockImplementation(() => {});

    try {
      // 実行
      const result = processRoutes([{ path: "/a", index: true, children: [{ path: "b" }] }]);

      // 検証
      expect(spy).toHaveBeenCalledTimes(1);
      expect(result.map((r) => r.path)).toContain("/a/b");
    } finally {
      spy.mockRestore();
    }
  });

  test("children 展開のマッチ順は等価な flat 配列と一致する (index が先)", ({ expect }) => {
    // 準備: flat 記法の慣習 (index を先に定義) と等価な children 記法
    const component = () => "x";
    const flat: RouteDefinition[] = [
      { path: "/", index: true, component },
      { path: "/", component },
      { path: "/posts", index: true, component },
      { path: "/posts", component },
      { path: "/posts/:postId", component },
    ];
    const nested: RouteDefinition[] = [
      {
        path: "/",
        component,
        children: [
          { index: true, component },
          {
            path: "posts",
            component,
            children: [
              { index: true, component },
              { path: ":postId", component },
            ],
          },
        ],
      },
    ];
    const flatRoutes = processRoutes(flat);
    const nestedRoutes = processRoutes(nested);

    // 実行と検証: 複数の URL でマッチ順 (子→親) が完全に一致する。
    for (const pathname of ["/", "/posts", "/posts/42"]) {
      const url = new URL("https://example.com" + pathname);
      const flatMatched = matchRoutes(flatRoutes, url)?.map((r) => `${r.path} index=${r.index}`);
      const nestedMatched = matchRoutes(nestedRoutes, url)?.map(
        (r) => `${r.path} index=${r.index}`,
      );
      expect(nestedMatched).toStrictEqual(flatMatched);
    }

    // 検証: "/" では index が先 (描画反転後にレイアウトが index を包む)。
    const rootMatched = matchRoutes(nestedRoutes, new URL("https://example.com/"))!;
    expect(rootMatched.map((r) => r.index)).toStrictEqual([true, false]);
  });
});

describe("末尾スラッシュの正規化", () => {
  test("トップレベルの末尾スラッシュを取り除く", ({ expect }) => {
    // 準備
    const routes: RouteDefinition[] = [{ path: "/about/" }];

    // 実行
    const result = processRoutes(routes);

    // 検証
    expect(result[0]?.path).toBe("/about");
  });
});

describe("パス省略時の正規化", () => {
  test("トップレベルのパス省略はルートパスになる", ({ expect }) => {
    // 準備
    const routes: RouteDefinition[] = [{}];

    // 実行
    const result = processRoutes(routes);

    // 検証
    expect(result[0]?.path).toBe("/");
  });
});

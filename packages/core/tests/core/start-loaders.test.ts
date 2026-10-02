import { NinjaPromise } from "ninja-promise";
import { describe, test, vi } from "vitest";

import { LoaderConditionError } from "../../src/core/errors.js";
import type { HistoryEntryId } from "../../src/core/history-entry-id-schema.js";
import type { HistoryEntryUrl } from "../../src/core/history-entry-url-schema.js";

const url = (s: string) => v.parse(HistoryEntryUrlSchema(), s);
import * as v from "valibot";

import HistoryEntryUrlSchema from "../../src/core/history-entry-url-schema.js";
import type { LoaderFunction, ShouldReloadFunction } from "../../src/core/route.types.js";
import startLoaders from "../../src/core/start-loaders.js";

describe("ローダー未定義および未知のルートに対する振る舞い", () => {
  test("ルートに loader が定義されていない場合、処理をスキップしてデータストアに変更を加えない", ({
    expect,
    signal,
  }) => {
    // 準備
    const dataStore = new Map();
    const args: any = {
      prevRoutes: [],
      currentRoutes: [
        {
          path: "/no-loader",
        },
      ],
      prevEntry: {
        id: "entry-0",
        url: { search: "" },
      },
      currentEntry: {
        id: "entry-1",
        url: { search: "" },
      },
      loaderDataStore: dataStore,
      signal,
    };

    // 実行
    startLoaders(args);

    // 検証
    expect(dataStore.has("entry-1")).toBe(false);
  });

  test("キャッシュが存在しない未知のルートの場合、新規に loader を実行して結果をデータストアに登録する", ({
    expect,
    signal,
  }) => {
    // 準備
    const dataStore = new Map();
    const mockLoader = vi.fn<LoaderFunction>().mockReturnValue(Promise.resolve("new-data"));
    const currentRoutes = [
      {
        path: "/new",
        loader: mockLoader,
      },
    ];
    const args: any = {
      currentRoutes,
      prevRoutes: [],
      prevEntry: {
        id: "entry-1",
        url: { search: "" },
      },
      currentEntry: {
        id: "entry-2",
        url: { search: "" },
      },
      loaderDataStore: dataStore,
      signal,
    };

    // 実行
    startLoaders(args);

    // 検証
    expect(mockLoader).toHaveBeenCalledTimes(1);

    const storedData = dataStore.get("entry-2");
    expect(storedData?.has(mockLoader)).toBe(true);
  });
});

describe("GET 遷移時の再読み込み制御", () => {
  test("shouldReload が true を返す場合、loader を再実行して新しい Promise を登録する", ({
    expect,
    signal,
  }) => {
    // 準備
    const mockLoader = vi.fn<LoaderFunction>().mockReturnValue(Promise.resolve("new-data"));
    const cachedPromise = NinjaPromise.resolve("old-data");

    const dataMap = new Map();
    dataMap.set(mockLoader, cachedPromise);

    const dataStore = new Map();
    dataStore.set("entry-1", dataMap); // 過去の実行履歴を作ることで、shoulReload を呼び出す

    const mockShouldReload = vi.fn<ShouldReloadFunction>().mockReturnValue(true);
    const route = {
      path: "/get-reload",
      loader: mockLoader,
      shouldReload: mockShouldReload,
    };
    const args: any = {
      prevRoutes: [route],
      currentRoutes: [route],
      prevEntry: {
        id: "entry-1",
        url: { search: "" },
      },
      currentEntry: {
        id: "entry-2",
        url: { search: "" },
      },
      loaderDataStore: dataStore,
      signal,
    };

    // 実行
    startLoaders(args);

    // 検証
    expect(mockLoader).toHaveBeenCalledTimes(1);
    expect(mockShouldReload).toHaveBeenCalledTimes(1);

    const storedPromise = dataStore.get("entry-2")?.get(mockLoader);
    expect(storedPromise).not.toBe(cachedPromise);
  });

  test("shouldReload が false を返す場合、loader を実行せず過去のキャッシュを登録する", ({
    expect,
    signal,
  }) => {
    // 準備
    const mockLoader = vi.fn<LoaderFunction>().mockReturnValue(Promise.resolve("new-data"));
    const cachedPromise = NinjaPromise.resolve("old-data");

    const dataMap = new Map();
    dataMap.set(mockLoader, cachedPromise);

    const dataStore = new Map();
    dataStore.set("entry-1", dataMap);

    const mockShouldReload = vi.fn<ShouldReloadFunction>().mockReturnValue(false);
    const route = {
      path: "/get-cache",
      loader: mockLoader,
      shouldReload: mockShouldReload,
    };
    const args: any = {
      prevRoutes: [route],
      currentRoutes: [route],
      prevEntry: {
        id: "entry-1",
        url: { search: "" },
      },
      currentEntry: {
        id: "entry-2",
        url: { search: "" },
      },
      loaderDataStore: dataStore,
      signal,
    };

    // 実行
    startLoaders(args);

    // 検証
    expect(mockShouldReload).toHaveBeenCalledOnce();
    expect(mockLoader).not.toHaveBeenCalled();

    const storedPromise = dataStore.get("entry-2")?.get(mockLoader);
    expect(storedPromise).toBe(cachedPromise);
  });

  test("entry.url.search に変更があれば既定値が true になる", ({ expect, signal }) => {
    // 準備
    const mockLoader = vi.fn<LoaderFunction>().mockReturnValue(Promise.resolve("new-data"));
    const cachedPromise = NinjaPromise.resolve("old-data");

    const dataMap = new Map();
    dataMap.set(mockLoader, cachedPromise);

    const dataStore = new Map();
    dataStore.set("entry-1", dataMap); // 過去の実行履歴を作ることで、shoulReload を呼び出す

    const mockShouldReload = vi
      .fn<ShouldReloadFunction>()
      .mockImplementation((args) => args.defaultShouldReload);
    const route = {
      path: "/get-reload",
      loader: mockLoader,
      shouldReload: mockShouldReload,
    };
    const args: any = {
      prevRoutes: [route],
      currentRoutes: [route],
      prevEntry: {
        id: "entry-1",
        url: { search: "?a=0" },
      },
      currentEntry: {
        id: "entry-2",
        url: { search: "?a=1" },
      },
      loaderDataStore: dataStore,
      signal,
    };

    // 実行
    startLoaders(args);

    // 検証
    expect(mockLoader).toHaveBeenCalledTimes(1);
    expect(mockShouldReload).toHaveBeenCalledTimes(1);
    expect(mockShouldReload.mock.calls[0]?.[0].defaultShouldReload).toBe(true);

    const storedPromise = dataStore.get("entry-2")?.get(mockLoader);
    expect(storedPromise).not.toBe(cachedPromise);
  });
});

describe("POST 遷移およびアクション後の再読み込み制御", () => {
  test("shouldReload の引数にオプションデータが追加される", ({ expect, signal }) => {
    // 準備
    const mockLoader = vi.fn<LoaderFunction>().mockReturnValue(Promise.resolve("new-data"));
    const cachedPromise = NinjaPromise.resolve("old-data");

    const dataMap = new Map();
    dataMap.set(mockLoader, cachedPromise);

    const dataStore = new Map();
    dataStore.set("entry-1", dataMap); // 過去の実行履歴を作ることで、shoulReload を呼び出す。

    const mockShouldReload = vi.fn<ShouldReloadFunction>().mockReturnValue(true);
    const route = {
      path: "/get-reload",
      loader: mockLoader,
      shouldReload: mockShouldReload,
    };
    const args: any = {
      prevRoutes: [route],
      currentRoutes: [route],
      prevEntry: {
        id: "entry-1",
        url: { search: "" },
      },
      currentEntry: {
        id: "entry-2",
        url: { search: "" },
      },
      loaderDataStore: dataStore,
      signal,
    };
    const options = {
      formData: new FormData(),
      actionData: { success: true },
    };

    // 実行
    startLoaders(args, options);

    // 検証
    expect(mockShouldReload.mock.calls[0]![0]).toHaveProperty("formData");
    expect(mockShouldReload.mock.calls[0]![0]).toHaveProperty("actionData");
  });
});

describe("shouldReload の異常系・エッジケースの振る舞い", () => {
  test("shouldReload が Promise などの非同期処理を返す場合、LoaderConditionError で拒否された NinjaPromise を登録する", async ({
    expect,
    signal,
  }) => {
    // 準備
    const mockLoader = vi.fn<LoaderFunction>();
    const mockShouldReload = vi
      .fn<ShouldReloadFunction>()
      .mockReturnValue(Promise.resolve(true) as unknown as boolean);

    const dataMap = new Map();
    dataMap.set(mockLoader, NinjaPromise.resolve("old-data"));

    const dataStore = new Map();
    dataStore.set("entry-1", dataMap); // 過去の実行履歴を作ることで、shoulReload を呼び出す。

    const args: any = {
      prevRoutes: [
        {
          path: "/async-reload",
          loader: mockLoader,
        },
      ],
      currentRoutes: [
        {
          path: "/async-reload",
          loader: mockLoader,
          shouldReload: mockShouldReload,
        },
      ],
      prevEntry: {
        id: "entry-1",
        url: { search: "" },
      },
      currentEntry: {
        id: "entry-2",
        url: new URL("https://example.com"),
      },
      loaderDataStore: dataStore,
      signal,
    };

    // 実行
    startLoaders(args);

    // 検証
    expect(mockLoader).not.toHaveBeenCalled();

    const storedPromise = dataStore.get("entry-2")?.get(mockLoader);
    await expect(storedPromise).rejects.toThrow(LoaderConditionError);
  });

  test("shouldReload 実行中に例外が発生した場合、そのエラーを理由として拒否された Promise を登録する", async ({
    expect,
    signal,
  }) => {
    // 準備
    const mockLoader = vi.fn<LoaderFunction>();
    const customError = new Error("Custom Error");
    const mockShouldReload = vi.fn<ShouldReloadFunction>().mockImplementation(() => {
      throw customError;
    });

    const dataMap = new Map();
    dataMap.set(mockLoader, NinjaPromise.resolve("old-data"));

    const dataStore = new Map();
    dataStore.set("entry-1", dataMap); // 過去の実行履歴を作ることで、shoulReload を呼び出す。

    const args: any = {
      prevRoutes: [
        {
          path: "/error-reload",
          loader: mockLoader,
        },
      ],
      currentRoutes: [
        { path: "/error-reload", loader: mockLoader, shouldReload: mockShouldReload },
      ],
      prevEntry: {
        id: "entry-1",
        url: { search: "" },
      },
      currentEntry: {
        id: "entry-2",
        url: { search: "" },
      },
      loaderDataStore: dataStore,
      signal,
    };

    // 実行
    startLoaders(args);

    // 検証
    const storedPromise = dataStore.get("entry-2")?.get(mockLoader);
    await expect(storedPromise).rejects.toThrow(customError);
  });

  test("shouldReload が boolean 以外の値を返す場合、LoaderConditionError で拒否された Promise を登録する", async ({
    expect,
    signal,
  }) => {
    // 準備
    const mockLoader = vi.fn<LoaderFunction>();
    const mockShouldReload = vi
      .fn<ShouldReloadFunction>()
      .mockReturnValue("invalid-string" as unknown as boolean);
    const route = {
      path: "/invalid-reload",
      loader: mockLoader,
      shouldReload: mockShouldReload,
    };

    const dataMap = new Map();
    dataMap.set(mockLoader, NinjaPromise.resolve("old-data"));

    const dataStore = new Map();
    dataStore.set("entry-1", dataMap);

    const args: any = {
      prevRoutes: [route],
      currentRoutes: [route],
      prevEntry: {
        id: "entry-1",
        url: { search: "" },
      },
      currentEntry: {
        id: "entry-2",
        url: new URL("https://example.com"),
      },
      loaderDataStore: dataStore,
      signal,
    };

    // 実行
    startLoaders(args);

    // 検証
    const storedPromise = dataStore.get("entry-2")?.get(mockLoader);
    await expect(storedPromise).rejects.toThrow(LoaderConditionError);
  });
});

describe("idle メソッドとデータストアへのマージ処理", () => {
  test("idle メソッドを呼び出すとスケジュールされたすべてのローダーの完了を待機する", async ({
    expect,
    signal,
  }) => {
    // 準備
    const mockLoader1 = vi.fn<LoaderFunction>().mockReturnValue(Promise.resolve("data-1"));
    const mockLoader2 = vi.fn<LoaderFunction>().mockReturnValue(Promise.resolve("data-2"));
    const currentRoutes = [
      { path: "/route-1", loader: mockLoader1 },
      { path: "/route-2", loader: mockLoader2 },
    ];

    const args: any = {
      prevRoutes: [],
      currentRoutes,
      prevEntry: {
        id: "entry-1",
        url: { search: "" },
      },
      currentEntry: {
        id: "entry-2",
        url: { search: "" },
      },
      loaderDataStore: new Map(),
      signal,
    };

    // 実行
    const startedLoaders = startLoaders(args);
    await startedLoaders.idle();

    // 検証
    expect(mockLoader1).toHaveBeenCalledOnce();
    expect(mockLoader2).toHaveBeenCalledOnce();
  });

  test("既存のデータストアの同じ ID に対して評価結果をマージし、既存のデータを破壊しない", ({
    expect,
    signal,
  }) => {
    // 準備
    const dataStore = new Map();
    const existingLoader = vi.fn<LoaderFunction>();
    const existingPromise = NinjaPromise.resolve("existing");

    const currentDataMap = new Map();
    currentDataMap.set(existingLoader, existingPromise);
    dataStore.set("entry-2", currentDataMap);

    const mockLoader = vi.fn<LoaderFunction>().mockReturnValue(Promise.resolve("new"));

    const args: any = {
      prevRoutes: [],
      currentRoutes: [
        {
          path: "/merge",
          loader: mockLoader,
        },
      ],
      prevEntry: {
        id: "entry-1",
        url: { search: "" },
      },
      currentEntry: {
        id: "entry-2", // 同じ ID に対して実行する。
        url: { search: "" },
      },
      loaderDataStore: dataStore,
      signal,
    };

    // 実行
    startLoaders(args);

    // 検証
    const mergedDataMap = dataStore.get("entry-2")!;
    expect(mergedDataMap.get(existingLoader)).toBe(existingPromise); // 既存データが維持されること。
    expect(mergedDataMap.has(mockLoader)).toBe(true); // 新規データが追加されること。
  });
});

describe("境界値およびエッジケースの振る舞い", () => {
  test("currentRoutes が空配列の場合、データストアに変更を加えない", ({ expect, signal }) => {
    // 準備
    const dataStore = new Map();
    const args: any = {
      prevRoutes: [{ path: "/old", loader: vi.fn<LoaderFunction>() }],
      currentRoutes: [],
      prevEntry: {
        id: "entry-1",
        url: { search: "" },
      },
      currentEntry: {
        id: "entry-2",
        url: { search: "" },
      },
      loaderDataStore: dataStore,
      signal,
    };

    // 実行
    startLoaders(args);

    // 検証
    expect(dataStore.size).toBe(0);
  });

  test("prevRoutes が null の場合、エラーを発生させずに空として処理を完了する", ({
    expect,
    signal,
  }) => {
    // 準備
    const dataStore = new Map();
    const mockLoader = vi.fn<LoaderFunction>().mockReturnValue(Promise.resolve("data"));
    const args: any = {
      prevRoutes: null,
      currentRoutes: [{ path: "/route", loader: mockLoader }],
      prevEntry: {
        id: "entry-1",
        url: { search: "" },
      },
      currentEntry: {
        id: "entry-2",
        url: { search: "" },
      },
      loaderDataStore: dataStore,
      signal,
    };

    // 実行
    startLoaders(args);

    // 検証
    expect(mockLoader).toHaveBeenCalledOnce();
    expect(dataStore.has("entry-2")).toBe(true);
  });

  test("currentRoutes に重複した loader 関数が含まれる場合、エラーなく完了して後のもので上書きする", ({
    expect,
    signal,
  }) => {
    // 準備
    const dataStore = new Map();
    // oxlint-disable-next-line vitest/require-mock-type-parameters
    const mockLoader = vi
      .fn<LoaderFunction>()
      .mockReturnValueOnce(Promise.resolve("first"))
      .mockReturnValueOnce(Promise.resolve("second"));

    const currentRoutes = [
      { path: "/route-a", loader: mockLoader },
      { path: "/route-b", loader: mockLoader },
    ];

    const args: any = {
      prevRoutes: [],
      currentRoutes,
      prevEntry: {
        id: "entry-1",
        url: { search: "" },
      },
      currentEntry: {
        id: "entry-2",
        url: { search: "" },
      },
      loaderDataStore: dataStore,
      signal,
    };

    // 実行
    startLoaders(args);

    // 検証
    expect(mockLoader).toHaveBeenCalledTimes(2);

    const storedMap = dataStore.get("entry-2")!;
    // 同じローダー関数キーは 1 つだけ存在する。
    expect(storedMap.size).toBe(1);
  });

  test("prevEntry と currentEntry の id が同一の場合、自身のキャッシュを参照して結果をマージする", ({
    expect,
    signal,
  }) => {
    // 準備
    const mockLoader = vi.fn<LoaderFunction>();
    const cachedPromise = NinjaPromise.resolve("cached-data");

    const existingDataMap = new Map();
    existingDataMap.set(mockLoader, cachedPromise);

    const dataStore = new Map();
    dataStore.set("same-entry-id", existingDataMap); // 同じ ID にすでにデータが存在する。

    const mockShouldReload = vi.fn<ShouldReloadFunction>().mockReturnValue(false); // キャッシュ再利用を指示する。
    const route = {
      path: "/same-id",
      loader: mockLoader,
      shouldReload: mockShouldReload,
    };

    const args: any = {
      prevRoutes: [route],
      currentRoutes: [route],
      prevEntry: {
        id: "same-entry-id",
        url: { search: "" },
      },
      currentEntry: {
        id: "same-entry-id",
        url: { search: "" },
      },
      loaderDataStore: dataStore,
      signal,
    };

    // 実行
    startLoaders(args);

    // 検証
    expect(mockLoader).not.toHaveBeenCalled();

    const mergedDataMap = dataStore.get("same-entry-id")!;
    expect(mergedDataMap.get(mockLoader)).toBe(cachedPromise);
  });
});

describe("startLoaders の POST 時の currentUrl", () => {
  test("currentUrl が currentEntry.url になる", ({ expect, signal }) => {
    // 準備
    let captured: any = null;
    const shouldReload: ShouldReloadFunction = (args) => {
      captured = args;
      return true;
    };
    const loader = () => "data";
    const route: any = { path: "/target", loader, shouldReload };
    const cached = NinjaPromise.resolve("old");
    const store = new Map();
    store.set("prev-id", new Map([[loader, cached]]));

    const prevUrl = url("https://example.com/prev");
    const currentUrl = url("https://example.com/current");

    // 実行
    startLoaders(
      {
        prevRoutes: [route],
        currentRoutes: [route],
        prevEntry: {
          id: "prev-id" as unknown as HistoryEntryId,
          url: prevUrl as unknown as HistoryEntryUrl,
        },
        currentEntry: {
          id: "curr-id" as unknown as HistoryEntryId,
          url: currentUrl as unknown as HistoryEntryUrl,
        },
        loaderDataStore: store,
        signal,
      },
      { formData: new FormData(), actionData: {} },
    );

    // 検証
    expect(captured).not.toBeNull();
    expect(captured.currentUrl.href).toBe(currentUrl.href);
    expect(captured.prevUrl.href).toBe(prevUrl.href);
  });
});

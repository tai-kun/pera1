import { describe, test } from "vitest";

import {
  LoaderConditionError,
  LoaderDataNotFoundError,
  NavigationApiNotSupportedError,
  RouteContextMissingError,
  RoutePatternMismatchError,
  RouterContextMissingError,
  UnexpectedValidationError,
  UnreachableError,
} from "../../src/core/errors.js";

describe("UnreachableError", () => {
  test("引数なしでは汎用メッセージになる", ({ expect }) => {
    // 実行
    const error = new UnreachableError({ actual: [] });

    // 検証
    expect(error).toBeInstanceOf(UnreachableError);
    expect(error.name).toBe("Pera1UnreachableError");
    expect(error.message).toBe("Unreachable code reached");
  });

  test("値ありでは値を含むメッセージになる", ({ expect }) => {
    // 実行
    const error = new UnreachableError({ actual: ["bad" as never] });

    // 検証
    expect(error.message).toContain("bad");
    expect(error.meta).toStrictEqual({ value: "bad" });
  });
});

describe("UnexpectedValidationError", () => {
  test("issues のメッセージが連結される", ({ expect }) => {
    // 準備
    const issues: any = [{ message: "error-a" }, { message: "error-b" }];

    // 実行
    const error = new UnexpectedValidationError({ value: "x", issues });

    // 検証
    expect(error.message).toBe("error-a: error-b");
    expect(error.name).toBe("Pera1UnexpectedValidationError");
  });
});

describe("NavigationApiNotSupportedError", () => {
  test("正しい名前とメッセージを持つ", ({ expect }) => {
    // 実行
    const error = new NavigationApiNotSupportedError();

    // 検証
    expect(error.name).toBe("Pera1NavigationApiNotSupportedError");
    expect(error.message).toContain("Navigation API");
  });
});

describe("LoaderConditionError", () => {
  test("同期外の Promise では専用メッセージになる", ({ expect }) => {
    // 実行
    const error = new LoaderConditionError({
      url: "/test",
      returnValue: Promise.resolve(true),
      shouldReload: () => true,
    });

    // 検証
    expect(error.message).toBe("shouldReload must return a boolean value synchronously");
    expect(error.name).toBe("Pera1LoaderConditionError");
  });

  test("非 boolean では型名を含むメッセージになる", ({ expect }) => {
    // 実行
    const error = new LoaderConditionError({
      url: "/test",
      returnValue: "invalid",
      shouldReload: () => true,
    });

    // 検証
    expect(error.message).toContain("Expected boolean");
  });
});

describe("RouterContextMissingError", () => {
  test("正しいメッセージを持つ", ({ expect }) => {
    // 実行
    const error = new RouterContextMissingError();

    // 検証
    expect(error.name).toBe("Pera1RouterContextMissingError");
    expect(error.message).toContain("RouterContext");
  });
});

describe("RouteContextMissingError", () => {
  test("正しいメッセージを持つ", ({ expect }) => {
    // 実行
    const error = new RouteContextMissingError();

    // 検証
    expect(error.name).toBe("Pera1RouteContextMissingError");
    expect(error.message).toContain("RouteContext");
  });
});

describe("LoaderDataNotFoundError", () => {
  test("loader ありでは関数名を含む", ({ expect }) => {
    // 準備
    function myLoader() {}

    // 実行
    const error = new LoaderDataNotFoundError({ loader: myLoader });

    // 検証
    expect(error.message).toContain("myLoader");
    expect(error.name).toBe("Pera1LoaderDataNotFoundError");
  });

  test("loader なしでは汎用メッセージになる", ({ expect }) => {
    // 実行
    const error = new LoaderDataNotFoundError({ loader: undefined });

    // 検証
    expect(error.message).toBe("Loader is undefined");
  });
});

describe("RoutePatternMismatchError", () => {
  test("route と target を含むメッセージになる", ({ expect }) => {
    // 実行
    const error = new RoutePatternMismatchError({ route: "/users/:id", target: "/posts/123" });

    // 検証
    expect(error.message).toContain("/users/:id");
    expect(error.message).toContain("/posts/123");
    expect(error.name).toBe("Pera1RoutePatternMismatchError");
    expect(error.meta).toStrictEqual({ route: "/users/:id", target: "/posts/123" });
  });
});

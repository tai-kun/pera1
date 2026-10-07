import { setGlobalConfig } from "valibot";
import { describe, test } from "vitest";

import {
  LoaderConditionError,
  LoaderDataNotFoundError,
  NavigationApiNotSupportedError,
  RouteContextMissingError,
  RoutePatternMismatchError,
  RouterContextMissingError,
  UnreachableError,
} from "../../src/core/errors.js";

describe("エラーメッセージの日本語化", () => {
  test("UnreachableError の日本語メッセージ（値なし）", ({ expect }) => {
    // 準備
    setGlobalConfig({ lang: "ja" });
    try {
      const error = new UnreachableError({ actual: [] });

      // 実行と検証
      expect(error.message).toBe("到達できないコードに到達しました");
    } finally {
      setGlobalConfig({ lang: "en" });
    }
  });

  test("UnreachableError の日本語メッセージ（値あり）", ({ expect }) => {
    // 準備
    setGlobalConfig({ lang: "ja" });
    try {
      const error = new UnreachableError({ actual: ["bad" as never] });

      // 実行と検証
      expect(error.message).toContain("不可能な値に遭遇しました");
      expect(error.message).toContain("bad");
    } finally {
      setGlobalConfig({ lang: "en" });
    }
  });

  test("NavigationApiNotSupportedError の日本語メッセージ", ({ expect }) => {
    // 準備
    setGlobalConfig({ lang: "ja" });
    try {
      const error = new NavigationApiNotSupportedError();

      // 実行と検証
      expect(error.message).toBe("現在の環境では Navigation API がサポートされていません");
    } finally {
      setGlobalConfig({ lang: "en" });
    }
  });

  test("LoaderConditionError の日本語メッセージ（Promise）", ({ expect }) => {
    // 準備
    setGlobalConfig({ lang: "ja" });
    try {
      const error = new LoaderConditionError({
        url: "/test",
        returnValue: Promise.resolve(true),
        shouldReload: () => true,
      });

      // 実行と検証
      expect(error.message).toBe("shouldReload は同期的に真偽値を返す必要があります");
    } finally {
      setGlobalConfig({ lang: "en" });
    }
  });

  test("LoaderConditionError の日本語メッセージ（非 boolean）", ({ expect }) => {
    // 準備
    setGlobalConfig({ lang: "ja" });
    try {
      const error = new LoaderConditionError({
        url: "/test",
        returnValue: "invalid",
        shouldReload: () => true,
      });

      // 実行と検証
      expect(error.message).toContain("真偽値を期待しましたが");
    } finally {
      setGlobalConfig({ lang: "en" });
    }
  });

  test("RouterContextMissingError の日本語メッセージ", ({ expect }) => {
    // 準備
    setGlobalConfig({ lang: "ja" });
    try {
      const error = new RouterContextMissingError();

      // 実行と検証
      expect(error.message).toContain("RouterContext が見つかりません");
    } finally {
      setGlobalConfig({ lang: "en" });
    }
  });

  test("RouteContextMissingError の日本語メッセージ", ({ expect }) => {
    // 準備
    setGlobalConfig({ lang: "ja" });
    try {
      const error = new RouteContextMissingError();

      // 実行と検証
      expect(error.message).toContain("RouteContext が見つかりません");
    } finally {
      setGlobalConfig({ lang: "en" });
    }
  });

  test("LoaderDataNotFoundError の日本語メッセージ（loader あり）", ({ expect }) => {
    // 準備
    setGlobalConfig({ lang: "ja" });
    function myLoader() {}
    try {
      const error = new LoaderDataNotFoundError({ loader: myLoader });

      // 実行と検証
      expect(error.message).toContain("ローダーデータが見つかりません");
      expect(error.message).toContain("myLoader");
    } finally {
      setGlobalConfig({ lang: "en" });
    }
  });

  test("LoaderDataNotFoundError の日本語メッセージ（匿名関数）", ({ expect }) => {
    // 準備
    setGlobalConfig({ lang: "ja" });
    const anon = () => {};
    Object.defineProperty(anon, "name", { value: "" });
    try {
      const error = new LoaderDataNotFoundError({
        loader: anon,
      });

      // 実行と検証
      expect(error.message).toContain("匿名");
    } finally {
      setGlobalConfig({ lang: "en" });
    }
  });

  test("LoaderDataNotFoundError の日本語メッセージ（loader なし）", ({ expect }) => {
    // 準備
    setGlobalConfig({ lang: "ja" });
    try {
      const error = new LoaderDataNotFoundError({ loader: undefined });

      // 実行と検証
      expect(error.message).toBe("ローダーが未定義です。");
    } finally {
      setGlobalConfig({ lang: "en" });
    }
  });

  test("RoutePatternMismatchError の日本語メッセージ", ({ expect }) => {
    // 準備
    setGlobalConfig({ lang: "ja" });
    try {
      const error = new RoutePatternMismatchError({ route: "/users/:id", target: "/posts/123" });

      // 実行と検証
      expect(error.message).toContain("/users/:id");
      expect(error.message).toContain("/posts/123");
    } finally {
      setGlobalConfig({ lang: "en" });
    }
  });
});

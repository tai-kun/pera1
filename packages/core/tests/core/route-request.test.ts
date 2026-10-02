import { describe, test, expectTypeOf } from "vitest";

import RouteRequest, {
  type RouteGetRequest,
  type RoutePostRequest,
} from "../../src/core/route-request.js";

describe("インスタンス生成", () => {
  describe("GET メソッドの場合", () => {
    test("静的メソッドで GET を指定して生成したとき、GET 用のプロパティを保持したインスタンスになる", ({
      expect,
    }) => {
      // 準備
      const url = new URL("https://example.com/api");
      const controller = new AbortController();
      const signal = controller.signal;

      // 実行
      const result = RouteRequest.new("GET", url, signal);

      // 検証
      expect(result.method).toBe("GET");
      expect(result.url).toBe(url);
      expect(result.signal).toBe(signal);
      expect(result.formData).toBe(null);
      expectTypeOf(result).toEqualTypeOf<RouteGetRequest>();
      expectTypeOf(result.method).toEqualTypeOf<"GET">();
    });

    test("コンストラクターで GET を指定して生成したとき、GET 用のプロパティを保持したインスタンスになる", ({
      expect,
    }) => {
      // 準備
      const url = new URL("https://example.com/api");
      const controller = new AbortController();
      const signal = controller.signal;

      // 実行
      const result = new RouteRequest("GET", url, signal);

      // 検証
      expect(result.method).toBe("GET");
      expect(result.url).toBe(url);
      expect(result.signal).toBe(signal);
      expect(result.formData).toBe(null);
      expectTypeOf(result.method).toEqualTypeOf<"GET" | "POST">();
    });
  });

  describe("POST メソッドの場合", () => {
    test("静的メソッドで POST を指定して生成したとき、POST 用のプロパティを保持したインスタンスになる", ({
      expect,
    }) => {
      // 準備
      const url = new URL("https://example.com/api");
      const controller = new AbortController();
      const signal = controller.signal;
      const formData = new FormData();

      // 実行
      const result = RouteRequest.new("POST", url, signal, formData);

      // 検証
      expect(result.method).toBe("POST");
      expect(result.url).toBe(url);
      expect(result.signal).toBe(signal);
      expect(result.formData).toBe(formData);
      expectTypeOf(result).toEqualTypeOf<RoutePostRequest>();
      expectTypeOf(result.method).toEqualTypeOf<"POST">();
    });

    test("コンストラクターで POST を指定して生成したとき、POST 用のプロパティを保持したインスタンスになる", ({
      expect,
    }) => {
      // 準備
      const url = new URL("https://example.com/api");
      const controller = new AbortController();
      const signal = controller.signal;
      const formData = new FormData();

      // 実行
      const result = new RouteRequest("POST", url, signal, formData);

      // 検証
      expect(result.method).toBe("POST");
      expect(result.url).toBe(url);
      expect(result.signal).toBe(signal);
      expect(result.formData).toBe(formData);
      expectTypeOf(result.method).toEqualTypeOf<"GET" | "POST">();
    });
  });
});

describe("Request オブジェクトへの変換機能", () => {
  describe("既定変換", () => {
    test("GET インスタンスを変換したとき、メソッドが GET でボディを持たない Request になる", ({
      expect,
    }) => {
      // 準備
      const url = new URL("https://example.com/");
      const controller = new AbortController();
      const routeRequest = RouteRequest.new("GET", url, controller.signal);

      // 実行
      const result = routeRequest.toRequest();

      // 検証
      expect(result).toBeInstanceOf(Request);
      expect(result.url).toBe("https://example.com/");
      expect(result.method).toBe("GET");
      expect(result.body).toBe(null);
    });

    test("POST インスタンスを変換したとき、メソッドが POST で指定した FormData をボディに持つ Request になる", async ({
      expect,
    }) => {
      // 準備
      const url = new URL("https://example.com/");
      const controller = new AbortController();
      const formData = new FormData();
      formData.append("key", "value");
      const routeRequest = RouteRequest.new("POST", url, controller.signal, formData);

      // 実行
      const result = routeRequest.toRequest();

      // 検証
      expect(result).toBeInstanceOf(Request);
      expect(result.url).toBe("https://example.com/");
      expect(result.method).toBe("POST");
      const actualFormData = await result.formData();
      expect(actualFormData.get("key")).toBe("value");
    });
  });

  describe("init オプションによる上書きと追加", () => {
    test("init でメソッドを上書きしたとき、指定したメソッドが Request に適用される", ({
      expect,
    }) => {
      // 準備
      const url = new URL("https://example.com/");
      const controller = new AbortController();
      const routeRequest = RouteRequest.new("GET", url, controller.signal);

      // 実行
      const result = routeRequest.toRequest({ method: "POST" });

      // 検証
      expect(result.method).toBe("POST");
    });

    test("init でボディを上書きしたとき、新しく指定したボディが Request に適用される", async ({
      expect,
    }) => {
      // 準備
      const url = new URL("https://example.com/");
      const controller = new AbortController();
      const originalFormData = new FormData();
      originalFormData.append("original", "1");
      const routeRequest = RouteRequest.new("POST", url, controller.signal, originalFormData);

      const newFormData = new FormData();
      newFormData.append("new", "2");

      // 実行
      const result = routeRequest.toRequest({ body: newFormData });

      // 検証
      const actualFormData = await result.formData();
      expect(actualFormData.get("new")).toBe("2");
      expect(actualFormData.has("original")).toBe(false);
    });

    test("init でヘッダーを追加したとき、Request のヘッダーに指定した値が付与される", ({
      expect,
    }) => {
      // 準備
      const url = new URL("https://example.com/");
      const controller = new AbortController();
      const routeRequest = RouteRequest.new("GET", url, controller.signal);

      // 実行
      const result = routeRequest.toRequest({ headers: { "X-Test": "123" } });

      // 検証
      expect(result.headers.get("X-Test")).toBe("123");
    });
  });
});

describe("境界値および特殊ケース", () => {
  test("事前に中断された AbortSignal を渡して変換したとき、Request のシグナルも中断状態になる", ({
    expect,
  }) => {
    // 準備
    const url = new URL("https://example.com/");
    const controller = new AbortController();
    controller.abort();
    const routeRequest = RouteRequest.new("GET", url, controller.signal);

    // 実行
    const result = routeRequest.toRequest();

    // 検証
    expect(result.signal.aborted).toBe(true);
  });

  test("変換後に AbortSignal を中断したとき、生成済みの Request のシグナルも中断状態に遷移する", ({
    expect,
  }) => {
    // 準備
    const url = new URL("https://example.com/");
    const controller = new AbortController();
    const routeRequest = RouteRequest.new("GET", url, controller.signal);
    const result = routeRequest.toRequest();

    // 実行
    controller.abort();

    // 検証
    expect(result.signal.aborted).toBe(true);
  });

  test("GET メソッドに対して init で強引にボディを指定して変換したとき、TypeError が発生する", ({
    expect,
  }) => {
    // 準備
    const url = new URL("https://example.com/");
    const controller = new AbortController();
    const routeRequest = RouteRequest.new("GET", url, controller.signal);

    // 実行と検証
    expect(() => {
      routeRequest.toRequest({ body: "不正なデータ" });
    }).toThrowError(TypeError);
  });
});

describe("RouteRequest のエッジケース", () => {
  test("GET の formData は null", ({ expect, signal }) => {
    // 準備
    const url = new URL("https://example.com/");

    // 実行
    const request = RouteRequest.new("GET", url, signal);

    // 検証
    expect(request.formData).toBeNull();
    expect(request.method).toBe("GET");
  });

  test("POST の method と formData が保持される", ({ expect, signal }) => {
    // 準備
    const url = new URL("https://example.com/");
    const formData = new FormData();
    formData.set("x", "1");

    // 実行
    const request = RouteRequest.new("POST", url, signal, formData);

    // 検証
    expect(request.method).toBe("POST");
    expect(request.formData).toBe(formData);
  });

  test("toRequest で headers を上書きできる", ({ expect, signal }) => {
    // 準備
    const url = new URL("https://example.com/");
    const request = RouteRequest.new("GET", url, signal);

    // 実行
    const httpRequest = request.toRequest({ headers: { "x-test": "1" } });

    // 検証
    expect(httpRequest.headers.get("x-test")).toBe("1");
  });

  test("toRequest で abort が伝播する", ({ expect }) => {
    // 準備
    const url = new URL("https://example.com/");
    const controller = new AbortController();
    const request = RouteRequest.new("GET", url, controller.signal);

    // 実行
    const httpRequest = request.toRequest();

    // 検証
    expect(httpRequest.signal.aborted).toBe(false);
    controller.abort();
    expect(controller.signal.aborted).toBe(true);
  });

  test("GET に body として FormData を渡すとエラーになる", ({ expect, signal }) => {
    // 準備
    const url = new URL("https://example.com/");
    const request = RouteRequest.new("GET", url, signal);

    // 実行と検証
    expect(() => request.toRequest({ body: new FormData() })).toThrow(TypeError);
  });
});

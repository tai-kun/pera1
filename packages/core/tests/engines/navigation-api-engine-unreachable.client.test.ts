import { test, vi } from "vitest";

vi.mock("../../src/core/start-action.js", () => ({
  default: () => ({
    func: () => {},
    data: { status: "pending" },
    idle: async () => ({}),
  }),
}));

import processRoutes from "../../src/core/_process-routes.js";
import { UnreachableError } from "../../src/core/errors.js";
import NavigationApiEngine from "../../src/engines/navigation-api-engine.js";

const VALID_ID = "550e8400-e29b-41d4-a716-446655440000";

test("action のステータスが不正なとき UnreachableError になる", async ({ expect }) => {
  // 準備
  await using cleanup = new AsyncDisposableStack();
  const listeners = new Map<string, any>();
  const navigation: any = {
    currentEntry: {
      id: VALID_ID,
      url: "https://example.com/",
      index: 0,
      addEventListener: vi.fn<() => void>(),
    },
    entries: () => [],
    addEventListener: vi.fn<(type: string, handler: any) => void>((type: string, handler: any) => {
      listeners.set(type, handler);
    }),
    navigate: vi.fn<() => void>(),
    traverseTo: vi.fn<() => void>(),
  };
  vi.stubGlobal("navigation", navigation);
  cleanup.defer(() => {
    vi.unstubAllGlobals();
  });
  const engine = new NavigationApiEngine();
  const routes = processRoutes([{ path: "/", action: () => "ok" }]);
  engine.start({
    routes: routes as any,
    update: (() => {}) as any,
    getSignal: () => new AbortController().signal,
    actionDataStore: new Map() as any,
    loaderDataStore: new Map() as any,
  });

  // 実行
  let captured: any = null;
  listeners.get("navigate")({
    isTrusted: true,
    canIntercept: true,
    hashChange: false,
    downloadRequest: null,
    navigationType: "push",
    destination: { url: "https://example.com/" },
    formData: new FormData(),
    sourceElement: null,
    intercept: (args: any) => {
      captured = args;
    },
  });

  // 検証: precommitHandler が UnreachableError で拒否される
  await expect(captured.precommitHandler({ redirect: vi.fn<() => void>() })).rejects.toThrow(
    UnreachableError,
  );
});

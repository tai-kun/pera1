import { describe, test, expectTypeOf } from "vitest";

import type { RouteParams } from "../../src/core/route.types.js";

describe("RouteParams", () => {
  test("パラメーターを正しく推論できる", () => {
    expectTypeOf({} as RouteParams<"/leagues/:routeId/:slugStr?/:subPage?">).toEqualTypeOf<{
      readonly routeId: string;
      readonly slugStr?: string;
      readonly subPage?: string;
    }>();
    expectTypeOf({} as RouteParams<"/foo/:bar.mp4">).toEqualTypeOf<{
      readonly bar: string;
    }>();
    expectTypeOf({} as RouteParams<"/foo/bar:action">).toEqualTypeOf<{}>();
    expectTypeOf({} as RouteParams).toEqualTypeOf<{
      readonly [x: string]: string | undefined;
    }>();
  });
});

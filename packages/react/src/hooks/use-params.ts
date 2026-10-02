import type { RouteParams } from "@pera1/core";

import useRouteContext from "./use-route-context.js";

/**
 * 現在のルートにマッチしたパスパラメーターを取得するためのカスタムフックです。
 *
 * @returns 現在のパスパラメーターを含むオブジェクトを返します。
 */
export default function useParams<TPath extends string = string>(): RouteParams<TPath> {
  return useRouteContext().params as RouteParams<TPath>;
}

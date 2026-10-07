import { RoutePath, type ReadonlyRoutePath } from "@pera1/core";
import { useMemo } from "react";

import useRouterContext from "./use-router-context.js";

export default function useRoutePath(): ReadonlyRoutePath {
  const url = useRouterContext((router) => router.currentEntry.url);
  const path = useMemo(() => new RoutePath(url), [url]);

  return path;
}

import useRouteContext from "./use-route-context.js";

/**
 * 現在の階層のルートに紐づく、動的パラメーターが具現化された実際の URL パス文字列を取得するカスタムフックです。
 *
 * @returns 現在のルートに対応する具現化済みの URL パス文字列（例: `"/items/123"`）を返します。
 */
export default function useFormAction(): string {
  return useRouteContext().urlPath;
}

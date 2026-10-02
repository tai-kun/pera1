import useRouteContext from "./use-route-context.js";

/**
 * 現在の階層のルートに紐づく、動的パラメーターを解決済みの実際の URL パス文字列を取得するカスタムフックです。
 *
 * @returns 現在のルートに対応する解決済みの URL パス文字列（例: `"/items/123"`）を返します。
 */
export default function useFormAction(): string {
  return useRouteContext().urlPath;
}

import type { MatchedRoute } from "@pera1/core";
import { createContext } from "react";
import type { ComponentType, ReactElement } from "react";

/**
 * 現在のコンポーネント階層に紐づく個別ルートのコンテキストです。
 */
export type RouteContextValue = MatchedRoute<ComponentType<{}>> & {
  /**
   * 現在のルートの下位に位置する子ルートを表示するための React 要素です。
   *
   * これ以上下位にマッチする子ルートが存在しない場合は `null` です。
   */
  readonly outlet: ReactElement | null;
};

/**
 * 階層的にネストされたルーターのレイアウト構造において、親ルートから子ルートへそれぞれの階層固有のルート情報を伝播させるための React コンテキストです。
 */
const RouteContext = /*#__PURE__*/ createContext<RouteContextValue | null>(null);

export default RouteContext;

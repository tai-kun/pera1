import type { RouterSnapshot } from "@pera1/core";
import * as React from "react";

/**
 * ルーターの実体へのアクセスを提供する、読み取り専用の Ref オブジェクト型です。
 *
 * 実体 (`RouterSnapshot`) は `@pera1/core` の `createRouter` が生成するフレームワーク共通のスナップショットです。
 */
export type RouterRef = Readonly<React.RefObject<RouterSnapshot>>;

/**
 * `RouterContext` がコンポーネントツリーの配下に供給するオブジェクトの型定義です。
 */
export type RouterContextValue = {
  /**
   * ルーターの最新実体への参照を保持する Ref オブジェクトです。
   */
  readonly routerRef: RouterRef;

  /**
   * ルーターの状態変更を監視するための購読関数です。
   *
   * @param onRouterChange ルーターの内部状態が変化した際に実行されるコールバック関数です。
   * @returns 監視を安全に解除するためのクリーンアップ関数を返します。
   */
  readonly subscribe: (onRouterChange: () => void) => () => void;
};

/**
 * アプリケーションの最上位からルーターのグローバル状態を子コンポーネントへ一元的に伝播させるための React コンテキストです。
 *
 * パフォーマンス最適化のためにプロバイダー自体は基本的に更新されず、子コンポーネントは `subscribe` と `useSyncExternalStore`を使って必要な部分データだけを購読します。
 */
const RouterContext = /*#__PURE__*/ React.createContext<RouterContextValue | null>(null);

export default RouterContext;

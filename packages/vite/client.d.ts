/**
 * `@pera1/vite` が提供する仮想モジュールの型定義です。
 *
 * アプリケーションの型チェックで参照するには、`tsconfig.json` の `compilerOptions.types` に
 * `@pera1/vite/client` を追加するか、ソースの先頭で `/// <reference types="@pera1/vite/client" />` を宣言します。
 */
declare module "virtual:pera1/routes" {
  import type { RouteDefinition } from "@pera1/core";

  /**
   * ページディレクトリーの構成から生成されたルート定義の配列です。
   */
  export const routes: readonly RouteDefinition<string, any>[];

  export default routes;
}

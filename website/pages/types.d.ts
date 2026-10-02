declare module "blume:data" {
  /**
   * Blume がビルド時に生成する、サイト全体のデータです。
   */
  const data: import("blume").BlumeData;
  export default data;
}

/**
 * Vite (Astro) がビルド時に注入する環境変数です。
 */
interface ImportMetaEnv {
  /**
   * デプロイ先のベースパスです。Astro の `deployment.base` に対応します。
   *
   * 未定義の可能性があるため、参照するときは `import.meta.env?.BASE_URL` のように存在を確認してください。
   */
  readonly BASE_URL?: string;
}

interface ImportMeta {
  /**
   * Vite (Astro) がビルド時に注入する環境変数です。
   *
   * Vite を経由せずに読み込まれた場合は未定義になるため、参照するときはオプショナルチェーンを使ってください。
   */
  readonly env?: ImportMetaEnv;
}

import * as React from "react";

/**
 * `React.lazy` を pera1 のルート定義で使えるようにするラッパーです。
 *
 * `component` は関数か `default` エクスポートが関数のモジュールを前提としているため、
 * `React.lazy` が返すオブジェクトをそのまま渡すと「コンポーネントなし」と判定されます。
 * 小さな関数で包み、`Suspense` のフォールバックを添えて公開します。
 *
 * pera1 には標準の遅延読み込み機構がないため、このラッパーは
 * `/lab/limits` で紹介している「限界を補うパターン」そのものです。
 *
 * @param importer 遅延読み込みするモジュールのインポート関数です。
 * @returns `Suspense` で包んだ遅延コンポーネントです。
 */
export function lazyPage(importer: () => Promise<{ default: React.ComponentType }>) {
  const Lazy = React.lazy(importer);

  return function LazyPage() {
    return (
      <React.Suspense
        fallback={
          <p className="lazy-fallback" role="status" data-testid="lazy-fallback">
            遅延チャンクを読み込み中…
          </p>
        }
      >
        <Lazy />
      </React.Suspense>
    );
  };
}

import * as React from "react";

/**
 * `AppErrorBoundary` に渡すプロパティーです。
 */
export type AppErrorBoundaryProps = {
  /**
   * 通常時に描画するコンテンツです。
   */
  readonly children: React.ReactNode;

  /**
   * エラー発生時に既定 UI の代わりに描画する関数です。
   *
   * 第 1 引数に捕捉したエラー、第 2 引数にエラー状態をリセットする関数を受け取ります。
   */
  readonly fallback?: (error: unknown, reset: () => void) => React.ReactNode;
};

/**
 * `AppErrorBoundary` が保持する状態です。
 */
type AppErrorBoundaryState = {
  /**
   * 捕捉したエラーです。エラーがないときは `null` です。
   */
  readonly error: unknown;
};

/**
 * ルート配下の描画エラーを一箇所で受け止めるためのエラーバウンダリーです。
 *
 * ローダー、アクション、遅延読み込みの失敗は `React.use` の拒否として伝播するため、
 * `Suspense` の外側に置いたこのバウンダリーがまとめて処理します。
 * ルートが変わったら `key` で作り直し、前の画面のエラー表示が残らないようにします。
 */
export default class AppErrorBoundary extends React.Component<
  AppErrorBoundaryProps,
  AppErrorBoundaryState
> {
  public state: AppErrorBoundaryState = { error: null };

  /**
   * 子の描画で投げられたエラーを state へ移し、次の描画でフォールバックを表示します。
   */
  public static getDerivedStateFromError(error: unknown): AppErrorBoundaryState {
    return { error };
  }

  /**
   * 再試行用にエラー状態を空へ戻します。子の描画はやり直され、ローダーの再取得も試みられます。
   */
  private readonly reset = (): void => {
    this.setState({ error: null });
  };

  public render(): React.ReactNode {
    const { error } = this.state;
    if (error !== null) {
      if (this.props.fallback) {
        return this.props.fallback(error, this.reset);
      }

      return (
        <section className="error-panel" role="alert">
          <h2 className="card-title">問題が発生しました</h2>
          <p className="muted">時間をおいて再度お試しください。</p>
          <details>
            <summary>技術的な詳細</summary>
            <pre className="error-detail">{String(error)}</pre>
          </details>
          <button
            type="button"
            className="button button-primary"
            data-testid="error-retry"
            onClick={this.reset}
          >
            再試行
          </button>
        </section>
      );
    }

    return this.props.children;
  }
}

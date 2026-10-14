import * as React from "react";

/**
 * 読み込み中の骨格表示（スケルトン）の土台です。
 *
 * ポップコーン UI の考え方で、画面全体を「読み込み中…」1 行に置き換えるのではなく、
 * 必要な領域だけを灰色の塊で保ちます。レイアウトを保つため各スケルトンには
 * `min-height` を付け、CLS（レイアウトのずれ）を防ぎます。
 *
 * - `SkeletonBlock`: 視覚だけの灰色の塊（`aria-hidden`）。読み上げません。
 * - `SkeletonStatus`: 読み上げ用の `role="status"` ラッパー。中身の視覚表示は
 *   `aria-hidden` にし、二重のアナウンスを防ぎます。
 *
 * 注意: スケルトン自体には既存の `data-testid` を付けません。E2E が待つ
 * 本物の要素（`stat-*` や `task-row-*` 等）と衝突させないためです。
 */

export function SkeletonBlock({
  width,
  height,
  style,
  className,
}: {
  readonly width?: string;
  readonly height?: string;
  readonly style?: React.CSSProperties;
  readonly className?: string;
}) {
  return (
    <span
      className={className === undefined ? "skeleton" : `skeleton ${className}`}
      aria-hidden="true"
      style={{ width, height, ...style }}
    />
  );
}

export function SkeletonStatus({
  text,
  children,
}: {
  /** 支援技術向けの読み上げ文言（視覚には出しません）。 */
  readonly text: string;
  readonly children: React.ReactNode;
}) {
  return (
    <div role="status">
      <span className="visually-hidden">{text}</span>
      <div aria-hidden="true">{children}</div>
    </div>
  );
}

/**
 * 画面全体の置き換え用（Root Suspense の fallback）。
 *
 * 見出しの骨格＋カード 3 個で高さを保ちます。可視の「読み込み中…」テキストは
 * 出さず、読み上げだけ `visually-hidden` で伝えます。
 */
export function PageSkeleton() {
  return (
    <SkeletonStatus text="ページを読み込み中">
      <div className="stack" style={{ minHeight: "60vh" }}>
        <div className="stack" style={{ gap: 8 }}>
          <SkeletonBlock width="12rem" height="2.5rem" />
          <SkeletonBlock width="70%" height="1.5rem" />
        </div>
        {[0, 1, 2].map((index) => (
          <div key={index} className="card" style={{ minHeight: "8rem" }}>
            <SkeletonBlock width="10rem" height="1.5rem" style={{ marginBottom: 8 }} />
            <SkeletonBlock width="100%" height="1rem" style={{ marginBottom: 8 }} />
            <SkeletonBlock width="60%" height="1rem" />
          </div>
        ))}
      </div>
    </SkeletonStatus>
  );
}

/** ダッシュボードの統計 4 マス用。`stat-grid` の格子を保ちます。 */
export function StatGridSkeleton() {
  return (
    <SkeletonStatus text="統計を読み込み中">
      <div className="stat-grid" style={{ minHeight: "7rem" }}>
        {[0, 1, 2, 3].map((index) => (
          <div key={index} className="stat-card" style={{ minHeight: "6rem" }}>
            <SkeletonBlock width="3rem" height="2rem" />
            <SkeletonBlock width="6rem" height="1rem" />
          </div>
        ))}
      </div>
    </SkeletonStatus>
  );
}

/** タスク一覧（行×3）用。`task-list` の高さを保ちます。 */
export function TaskListSkeleton() {
  return (
    <SkeletonStatus text="タスク一覧を読み込み中">
      <section className="card" style={{ minHeight: "16rem" }}>
        <SkeletonBlock width="8rem" height="1.5rem" style={{ marginBottom: 16 }} />
        <ul className="task-list">
          {[0, 1, 2].map((index) => (
            <li key={index} className="task-row">
              <span style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
                <SkeletonBlock width="60%" height="1.25rem" />
                <SkeletonBlock width="40%" height="1rem" />
              </span>
              <SkeletonBlock width="6rem" height="2.5rem" />
            </li>
          ))}
        </ul>
      </section>
    </SkeletonStatus>
  );
}

/** プロジェクト一覧用。カード 2 個で高さを保ちます。 */
export function ProjectListSkeleton() {
  return (
    <SkeletonStatus text="プロジェクト一覧を読み込み中">
      <div className="stack" style={{ minHeight: "24rem" }}>
        {[0, 1].map((index) => (
          <article key={index} className="card project-card" style={{ minHeight: "10rem" }}>
            <SkeletonBlock width="12rem" height="1.5rem" />
            <SkeletonBlock width="100%" height="1rem" />
            <SkeletonBlock width="60%" height="1rem" />
          </article>
        ))}
      </div>
    </SkeletonStatus>
  );
}

/** 検索結果（件数＋リスト）用。 */
export function SearchResultsSkeleton() {
  return (
    <SkeletonStatus text="検索結果を読み込み中">
      <div className="stack" style={{ minHeight: "12rem" }}>
        <SkeletonBlock width="6rem" height="1.25rem" />
        <ul className="list">
          {[0, 1, 2].map((index) => (
            <li key={index} className="list-item">
              <span style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
                <SkeletonBlock width="50%" height="1.25rem" />
                <SkeletonBlock width="30%" height="1rem" />
              </span>
            </li>
          ))}
        </ul>
      </div>
    </SkeletonStatus>
  );
}

/** プロジェクトのヘッダー（見出し＋説明）用。 */
export function ProjectHeaderSkeleton() {
  return (
    <SkeletonStatus text="プロジェクト情報を読み込み中">
      <div className="card project-header" style={{ minHeight: "9rem" }}>
        <SkeletonBlock width="14rem" height="2rem" style={{ marginBottom: 8 }} />
        <SkeletonBlock width="80%" height="1.25rem" style={{ marginBottom: 8 }} />
        <SkeletonBlock width="8rem" height="1rem" />
      </div>
    </SkeletonStatus>
  );
}

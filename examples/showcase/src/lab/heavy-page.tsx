import * as React from "react";

/**
 * 遅延読み込みされる重たいページです。
 *
 * `/lab/limits` の「ルートの遅延読み込み」デモで、別チャンクとして読み込まれます。
 * チャンクを体感しやすいよう、初回モジュール評価時に少しだけ計算します。
 */

type Point = { readonly label: string; readonly value: number };

/**
 * 描画負荷を作るためのダミーデータ生成です (チャンク分割の確認用)。
 */
function buildPoints(count: number): readonly Point[] {
  return Array.from({ length: count }, (_, index) => ({
    label: `#${index + 1}`,
    value: Math.round(20 + 60 * Math.abs(Math.sin(index / 7))),
  }));
}

const POINTS = buildPoints(240);

export default function HeavyPage() {
  return (
    <section className="card" data-testid="heavy-page">
      <h2>重たいページ (遅延チャンク)</h2>
      <p className="muted">
        この画面は `React.lazy` のラッパー経由で読み込まれています。 グラフ風の 240
        本のバーは、別チャンクとしてビルドされた証拠です。
      </p>
      <p>
        バーの本数: <strong>{POINTS.length}</strong>
      </p>
      <div className="bar-chart" aria-hidden="true">
        {POINTS.map((point) => (
          <span
            key={point.label}
            className="bar"
            style={{ height: `${point.value}%` }}
            title={`${point.label}: ${point.value}`}
          />
        ))}
      </div>
    </section>
  );
}

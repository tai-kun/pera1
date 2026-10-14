import { useNavigation } from "@pera1/react";
import * as React from "react";

/**
 * 全体の進行状態を細いバーで示す表示です。
 *
 * `Suspense` のフォールバックが遅延データの「穴埋め表示」なのに対し、こちらは
 * ナビゲーション全体の「進行中表示」です。`Suspense` の内側に置くとフォールバックに
 * 置き換わって見えなくなるため、必ず `Suspense` の外側 (レイアウト側) で使います。
 *
 * 太いテキストバナーではなく高さ 4px の細いプログレスラインで示し、
 * レイアウトの押し下げを最小化します。状態の文言は `visually-hidden` で
 * 支援技術にだけ伝え、`role="status"` でアナウンスします。
 */
export default function PendingBar() {
  const navigation = useNavigation();

  // 常時同じ高さの領域を確保し、レイアウトのガタつき（CLS）を防ぐため、
  // idle 時もコンテナー自体は残し、中身の可視性だけ切り替えます。
  // idle 時は背景を透明にして視覚ノイズを消し、role/testid も付けません。
  if (navigation.state === "idle") {
    return (
      <div className="pending-bar" data-state="idle" aria-hidden="true">
        <span className="pending-bar-fill" aria-hidden="true" hidden />
      </div>
    );
  }

  const label = navigation.state === "submitting" ? "送信中…" : "読み込み中…";

  return (
    <div
      className="pending-bar"
      data-state={navigation.state}
      role="status"
      aria-live="polite"
      data-testid="pending-bar"
    >
      <span className="visually-hidden">{label}</span>
      <span className="pending-bar-fill" aria-hidden="true" />
    </div>
  );
}

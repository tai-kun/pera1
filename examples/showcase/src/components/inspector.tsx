/**
 * Lab のインスペクター系 UI で共有する表示ユーティリティーです。
 */

/**
 * `unknown` を画面表示用の文字列にします。
 *
 * 循環参照などで `JSON.stringify` が失敗しても落ちないようにし、
 * 関数は `[Function]` として表記します。
 */
export function safeStringify(value: unknown): string {
  try {
    return (
      JSON.stringify(
        value,
        (_key, item) => (typeof item === "function" ? "[Function]" : item),
        2,
      ) ?? String(value)
    );
  } catch {
    return String(value);
  }
}

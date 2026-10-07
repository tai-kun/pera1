/**
 * パス区切りを `/` に統一します。
 *
 * Windows の `\` 区切りでも、URL やインポート指定子、glob の結果として扱えるようにするために使います。
 * Vite の `normalizePath` と同じく、常にバックスラッシュをスラッシュへ置き換えます。
 *
 * @param filePath 変換する対象のパスです。
 * @returns スラッシュ区切りのパスです。
 */
export default function normalizePath(filePath: string): string {
  return filePath.replaceAll("\\", "/");
}

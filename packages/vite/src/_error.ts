/**
 * catch 節で受け取った未知の値をメッセージ文字列へ変換します。
 *
 * @param ex catch 節で受け取った未知の値です。
 * @returns 人間が読めるメッセージ文字列です。
 */
export default function toErrorMessage(ex: unknown): string {
  if (ex instanceof Error) {
    return ex.message;
  }

  return String(ex);
}

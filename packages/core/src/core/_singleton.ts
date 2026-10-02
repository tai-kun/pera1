import { callFnOnce } from "call-fn-once";

/**
 * 初回実行時の生成結果を保持するためのグローバルなキャッシュ管理マップです。
 */
const cacheMap: callFnOnce.CacheMap = new Map();

/**
 * 指定された識別子に対して、渡されたファクトリー関数を一度だけ実行し、その生成結果をシングルトンとして永続化および共有します。
 *
 * 2回目以降の呼び出しでは、ファクトリー関数は実行されず、初回に生成されたキャッシュデータが即座に返されます。
 *
 * @template T ファクトリー関数が生成するシングルトンオブジェクトの型定義です。
 * @param key シングルトンオブジェクトをキャッシュ内で一意に識別するためのキーです。
 * @param fn 初回呼び出し時にのみ実行される、オブジェクト生成用のファクトリー関数です。
 * @returns 初回実行時に生成された、またはキャッシュから回収された型 `T` のシングルトンインスタンスを返します。
 */
export default function singleton<T>(key: unknown, fn: (...args: any) => T): T {
  return callFnOnce(cacheMap, key, fn);
}

import { tryCaptureStackTrace } from "try-capture-stack-trace";

import { UnreachableError } from "./errors.js";

/**
 * 網羅性チェックにおいて、プログラムの制御フローが理論上決して到達しないはずの場所に達したことを示すための関数です。
 */
function unreachable(): never;

/**
 * 網羅性チェックにおいて、プログラムの制御フローが理論上決して到達しないはずの場所に達したことを示すための関数です。
 *
 * * `switch` 文の `default` 句などでこの関数に値を渡すことにより、すべての列挙型やユニオン型のケースが処理し尽くされているかを静的に検証します。
 *
 * 漏れがある場合、TypeScript は引数が `never` 型に適合しないというコンパイルエラーを報告します。
 *
 * @param value すべての分岐が処理された結果として、理論上 `never` 型になっているべき変数です。
 */
function unreachable(value: never): never;

function unreachable(...actual: [never?]): never {
  const error = new UnreachableError({ actual });
  tryCaptureStackTrace(error, unreachable);
  throw error;
}

export default unreachable;

import { tryCaptureStackTrace } from "try-capture-stack-trace";
import { type InferOutput, safeParse } from "valibot";

import { UnexpectedValidationError } from "./errors.js";

/***************************************************************************************************
 *
 * 再エクスポート
 *
 **************************************************************************************************/

export { url, pipe, uuid, brand, number, string, minValue, nullable, safeInteger } from "valibot";
export type { InferInput, InferOutput } from "valibot";

export { object, transform } from "@tai-kun/valibot-extra-lab";

/***************************************************************************************************
 *
 * expect
 *
 **************************************************************************************************/

type BaseSchema = typeof safeParse extends (schema: infer TSchema, ...args: any) => any
  ? TSchema
  : never;

/**
 * 指定されたスキーマに基づいて入力値の構造を検証し、成功した場合は型安全に解析済みの値を出力します。
 *
 * @template TSchema 評価に使用する `valibot` 形式のスキーマ定義型です。
 * @param schema 入力値を検証するためのスキーマ定義オブジェクトです。
 * @param input 整合性を検証する対象となる未知のデータです。
 * @returns スキマの定義に完全に合致し、型付けが完了した解析済みの出力データを返します。
 */
export function expect<const TSchema extends BaseSchema>(
  schema: TSchema,
  input: unknown,
): InferOutput<TSchema> {
  const result = safeParse(schema, input);
  if (result.success) {
    return result.output;
  }

  const error = new UnexpectedValidationError({
    value: input,
    issues: result.issues,
  });
  tryCaptureStackTrace(error, expect);
  throw error;
}

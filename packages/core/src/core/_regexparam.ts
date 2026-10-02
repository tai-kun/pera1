/**
 * 個別のパスパラメーターを解析し、適切なプロパティーの型オブジェクトへと変換する内部ユーティリティー型です。
 *
 * パラメーターの末尾の形状を条件付き型により詳細に選別します。
 *
 * @template Param 解析対象となる単一のパラメーター文字列です。
 */
// oxfmt-ignore
type ParamRecord<Param extends string> =
  // パラメーター末尾に「?」がある場合、オプショナルなプロパティー型に変換します
    Param extends `${infer Name}?`
    ? { [K in Name]?: string }

  // パラメーターに拡張子が含まれている場合、拡張子を除いた名前を必須のプロパティー型に変換します。
  : Param extends `${infer Name}.${string}`
    ? { [K in Name]: string }

  // 上記のいずれのパターンにも該当しない場合は、パラメーター名をそのまま必須のプロパティー型に変換します。
  : { [K in Param]: string };

/**
 * パス文字列のセグメントから動的なパラメーターやワイルドカードを再帰的に抽出し、型安全なオブジェクト構造を構築するユーティリティー型です。
 *
 * 開発者が指定した文字列リテラル型の形状に基づいて、ルーティングに必要なパラメーターの型を静的に決定します。
 *
 * このユーティリティー型は、ライブラリー `regexparam` の改良版です。
 *
 * @template T 解析対象となる URL パス全体の文字列リテラル型です。
 * @see https://github.com/lukeed/regexparam
 * @see https://github.com/lukeed/regexparam/issues/31
 * @see https://github.com/lukeed/regexparam/pull/33
 */
// oxfmt-ignore
export type RouteParams<T extends string> =
  // 与えられた型が具体的なリテラルでなく文字列型である場合は、汎用的なレコード型へとフォールバックします。
    string extends T
    ? { [K in string]?: string }

  // パスの中間にワイルドカードが存在する場合、前後のパラメーターに加えて、必須のワイルドカードプロパティーを結合します。
  : T extends `${infer Prev}/*/${infer Rest}`
    ? & RouteParams<Prev>
      & { wild: string }
      & RouteParams<`/${Rest}`>

  // パスの先頭がコロンで開始されている場合、先頭にスラッシュ（/）を補正して再帰的に再評価します。
  : T extends `:${infer Rest}`
    ? RouteParams<`/:${Rest}`>

  // パスの中間にコロンで始まるパラメーターが含まれている場合、そのセグメントの型情報を抽出し、スラッシュ以降の残りのパスの解析結果と交差型で結合します。
  : T extends `${string}:${infer Param}/${infer Rest}`
    ? & ParamRecord<Param>
      & RouteParams<`/${Rest}`>

  // パスの末尾がコロンで始まるパラメーターで終了している場合、そのセグメントの型情報を判定して抽出を完了します。
  : T extends `${string}/:${infer Param}`
    ? ParamRecord<Param>

  // パスの末尾がオプショナルワイルドカードで終了している場合、キー名を「"*"」としたオプショナルなプロパティー型を返します。
  : T extends `${string}/*?`
    ? { "*"?: string }

  // パスの末尾が通常のワイルドカードで終了している場合、キー名を「"*"」とした必須のプロパティー型を返します。
  : T extends `${string}/*`
    ? { "*": string }

  // 抽出可能なパラメーターやワイルドカードが一切検出されなかった場合は、空のオブジェクト型を返します。
  : {};

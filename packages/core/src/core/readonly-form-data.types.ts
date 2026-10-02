/**
 * フォームデータを読み取り専用で操作するためのインターフェースです。
 *
 * データの追加、削除、更新といった変更処理を禁止し、データの参照や走査のみを許可する目的で使用します。
 *
 * [MDN リファレンス](https://developer.mozilla.org/docs/Web/API/FormData)
 */
export interface ReadonlyFormData {
  /**
   * 指定された名前に一致する最初のフォームデータの値を取得します。
   *
   * @param name 検索するフォームコントロールのキー名です。
   * @returns 一致したデータを返します。データは文字列または `File` オブジェクトのいずれかです。指定された名前のキーが存在しない場合は `null` を返します。
   *
   * [MDN リファレンス](https://developer.mozilla.org/docs/Web/API/FormData/get)
   */
  get(name: string): FormDataEntryValue | null;

  /**
   * 指定された名前に一致するすべてのフォームデータの値を配列として取得します。
   *
   * @param name 検索するフォームコントロールのキー名です。
   * @returns 一致したすべてのデータを含む配列です。キーが存在しない場合は空の配列を返します。
   *
   * [MDN リファレンス](https://developer.mozilla.org/docs/Web/API/FormData/getAll)
   */
  getAll(name: string): FormDataEntryValue[];

  /**
   * 指定された名前を持つフォームデータが存在するかどうかを判定します。
   *
   * @param name 検証するフォームコントロールのキー名です。
   * @returns 指定されたキーが存在する場合は `true` を、存在しない場合は `false` を返します。
   *
   * [MDN リファレンス](https://developer.mozilla.org/docs/Web/API/FormData/has)
   */
  has(name: string): boolean;

  /**
   * コールバック関数を使用して、格納されているすべてのフォームデータに対して反復処理を実行します。
   *
   * @param callbackfn 各データに対して実行するコールバック関数です。
   * @param thisArg コールバック関数を実行する際に `this` として使用する値です。
   */
  forEach(
    callbackfn: (value: FormDataEntryValue, key: string, parent: ReadonlyFormData) => void,
    thisArg?: any,
  ): void;

  /**
   * 格納されているすべてのキーと値のペアを順に処理するための反復子（イテレーター）を返します。
   *
   * @returns キーと値のペアを要素とする `IterableIterator` オブジェクトです。
   *
   * [MDN リファレンス](https://developer.mozilla.org/docs/Web/API/FormData/entries)
   */
  entries(): IterableIterator<[string, FormDataEntryValue]>;

  /**
   * 格納されているすべてのキー名を順に処理するための反復子を返します。
   *
   * @returns 各データのキー名を要素とする `IterableIterator` オブジェクトです。
   *
   * [MDN リファレンス](https://developer.mozilla.org/docs/Web/API/FormData/keys)
   */
  keys(): IterableIterator<string>;

  /**
   * 格納されているすべての値のみを順に処理するための反復子を返します。
   *
   * @returns 各データの値（文字列または `File` オブジェクト）を要素とする `IterableIterator` オブジェクトです。
   *
   * [MDN リファレンス](https://developer.mozilla.org/docs/Web/API/FormData/values)
   */
  values(): IterableIterator<FormDataEntryValue>;

  /**
   * オブジェクトの既定の反復子を定義します。 `for...of` 構文などで直接オブジェクトを走査することを可能にします。
   *
   * @returns `entries` メソッドと同様に、キーと値のペアを要素とする `IterableIterator` オブジェクトです。
   */
  [Symbol.iterator](): IterableIterator<[string, FormDataEntryValue]>;
}

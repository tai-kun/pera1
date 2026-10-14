import * as React from "react";

/**
 * `CodeBlock` に渡すプロパティーです。
 */
type CodeBlockProps = {
  /**
   * コードブロックの見出しです。省略すると `figcaption` を描画しません。
   */
  readonly title?: string;

  /**
   * 表示するコードです。そのままの文字列で描画します。
   */
  readonly code: string;
};

/**
 * コードスニペットを等幅フォントで表示するための小さな部品です。
 *
 * Lab の各ページで API の呼び出し例を見せるために使います。
 * 装飾は `lab.css` 側で行うため、ここでは意味のあるマークアップだけを組み立てます。
 */
export function CodeBlock(props: CodeBlockProps): React.ReactElement {
  const { title, code } = props;

  return (
    <figure className="code-block">
      {title === undefined ? null : <figcaption>{title}</figcaption>}
      <pre>
        <code>{code}</code>
      </pre>
    </figure>
  );
}

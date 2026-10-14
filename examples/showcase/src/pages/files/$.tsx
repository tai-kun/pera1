import { type LoaderFunctionArgs, useLoaderData } from "@pera1/react";
import * as React from "react";

import { TaskListSkeleton } from "../../components/skeleton.js";

/**
 * `/files/*` のワイルドカード部分を分解して返します。
 *
 * ワイルドカードは残りのパス全体を 1 つの値として受け取ります。
 * 表示用に `/` 区切りのセグメントへ分解します。
 */
export async function loader({ params }: LoaderFunctionArgs) {
  const wildcard = params["*"] ?? "";
  const segments = wildcard.split("/").filter(Boolean);

  return { wildcard, segments };
}

/**
 * 受け取った値のカードだけを描画します。
 *
 * ローダー読みはこの子に限定し、親の見出し・試せるリンクは suspend させません。
 */
function WildcardDetail() {
  const { wildcard, segments } = React.use(useLoaderData<typeof loader>());

  return (
    <section className="card" aria-labelledby="wildcard-detail-heading">
      <h2 id="wildcard-detail-heading" className="card-title">
        受け取った値
      </h2>
      <p>
        ワイルドカード:{" "}
        <code data-testid="wildcard-path">{wildcard === "" ? "（なし）" : wildcard}</code>
      </p>
      <nav className="breadcrumb" aria-label="パスのセグメント" data-testid="wildcard-segments">
        {segments.length === 0 ? (
          <span className="muted">セグメントはありません。</span>
        ) : (
          <ol>
            {segments.map((segment, index) => {
              const partial = segments
                .slice(0, index + 1)
                .map((value) => encodeURIComponent(value))
                .join("/");

              return (
                <li key={partial}>
                  <span aria-hidden="true">/</span>
                  <a href={`/files/${partial}`}>{segment}</a>
                </li>
              );
            })}
          </ol>
        )}
      </nav>
    </section>
  );
}

/**
 * `/files/*` のページです。
 *
 * ワイルドカードがどのように値として届くかを、生の文字列とセグメントの
 * パンくずの両方で確認できます。
 * 見出し・試せるリンクは `Suspense` の外に置き、受け取った値だけを
 * スケルトンで穴埋めします。
 */
export default function FilesPage() {
  return (
    <section className="stack" aria-labelledby="files-heading">
      <div>
        <h1 id="files-heading" className="page-title">
          ファイル（ワイルドカード）
        </h1>
        <p className="page-lead">
          タスクの添付ファイル置き場の見本です。下の体験用リンクから、深い階層のパス表示を確かめられます。
        </p>
        <p>
          <span className="badge">開発者向けメモ</span>{" "}
          ワイルドカードの受け取り方の見本も兼ねています。
        </p>
      </div>

      <React.Suspense fallback={<TaskListSkeleton />}>
        <WildcardDetail />
      </React.Suspense>

      <section className="card" aria-labelledby="files-links-heading">
        <h2 id="files-links-heading" className="card-title">
          試せるリンク
        </h2>
        <ul className="list">
          <li className="list-item">
            <a href="/files/a/b/c.txt">/files/a/b/c.txt</a>
          </li>
          <li className="list-item">
            <a href="/files/docs/README.md">/files/docs/README.md</a>
          </li>
          <li className="list-item">
            <a href="/files/single.txt">/files/single.txt</a>
          </li>
        </ul>
      </section>
    </section>
  );
}

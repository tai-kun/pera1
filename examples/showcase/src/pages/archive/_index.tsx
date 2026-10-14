import { useLoaderData } from "@pera1/react";
import * as React from "react";

import { listProjectsByYear } from "../../api/projects.js";
import { ProjectListSkeleton } from "../../components/skeleton.js";

/**
 * 年の選択肢です。`undefined` は「すべて」を表します。
 */
const YEAR_LINKS: readonly { readonly label: string; readonly year: number | undefined }[] = [
  { label: "すべて", year: undefined },
  { label: "2025", year: 2025 },
  { label: "2026", year: 2026 },
];

/**
 * 年の指定がないアーカイブ一覧を返します。
 *
 * ファイルベースルーティングでは省略可能パラメーター (`:year?`) を
 * ファイル名で表せないため、`/archive` と `/archive/:year` を
 * `_index.tsx` と `$year.tsx` の 2 ファイルで実演します。
 * このファイルは年なしの全件を返します。
 */
export async function loader() {
  return { year: undefined as number | undefined, projects: await listProjectsByYear(undefined) };
}

/**
 * アーカイブの一覧だけを描画します。
 *
 * ローダー読みはこの子に限定し、親の見出し・年チップは suspend させません。
 */
function ArchiveList() {
  const { year, projects } = React.use(useLoaderData<typeof loader>());

  return (
    <>
      <p className="muted">
        表示中の年: <strong data-testid="archive-year">{year ?? "すべて"}</strong>
      </p>

      {projects.length === 0 ? (
        <div className="empty-state" role="status">この年のプロジェクトはありません。</div>
      ) : (
        <ul className="list">
          {projects.map((project) => (
            <li key={project.id} className="list-item">
              <span
                className="color-dot"
                style={{ background: project.color }}
                aria-hidden="true"
              />
              <a href={`/projects/${project.id}`}>{project.name}</a>
              <span className="muted">
                作成日:{" "}
                <time dateTime={project.createdAt}>
                  {new Date(project.createdAt).toLocaleDateString("ja-JP")}
                </time>
              </span>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

/**
 * `/archive` のアーカイブページです。
 *
 * 年付きの URL (`/archive/2026` など) は `archive/$year.tsx` が担当します。
 * 見出し・年チップは `Suspense` の外に置き、一覧だけをスケルトンで穴埋めします。
 */
export default function ArchiveIndexPage() {
  const year: number | undefined = undefined;

  return (
    <section className="stack" aria-labelledby="archive-heading">
      <div>
        <h1 id="archive-heading" className="page-title">
          アーカイブ
        </h1>
        <p className="page-lead">
          終わった仕事を年度ごとに振り返る置き場です。年を選ぶと、その年に始めたプロジェクトだけが残ります。
        </p>
      </div>

      <div className="cluster">
        {YEAR_LINKS.map((link) => {
          const active = link.year === year;

          return (
            <a
              key={link.label}
              className={`chip ${active ? "chip-active" : ""}`}
              href={link.year === undefined ? "/archive" : `/archive/${link.year}`}
              aria-current={active ? "page" : undefined}
            >
              {link.label}
            </a>
          );
        })}
      </div>

      <React.Suspense fallback={<ProjectListSkeleton />}>
        <ArchiveList />
      </React.Suspense>
    </section>
  );
}

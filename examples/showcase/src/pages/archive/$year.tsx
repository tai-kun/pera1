import { type LoaderFunctionArgs, useLoaderData, useParams } from "@pera1/react";
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
 * 年で絞り込んだプロジェクト一覧を返します。
 *
 * ファイルベースルーティングでは省略可能パラメーター (`:year?`) を
 * ファイル名で表せないため、`/archive` と `/archive/:year` を
 * `_index.tsx` と `$year.tsx` の 2 ファイルで実演します。
 * 形式が不正な値は入力不備ではなく URL の誤りとして例外にします。
 */
export async function loader({ params }: LoaderFunctionArgs) {
  const rawYear = params["year"];
  if (rawYear === undefined) {
    throw new Error("年が指定されていません。");
  }
  if (!/^\d{4}$/u.test(rawYear)) {
    throw new Error("年は 4 桁の数字で指定してください。");
  }

  const year = Number(rawYear);

  return { year, projects: await listProjectsByYear(year) };
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
 * `/archive/:year` のアーカイブページです。
 *
 * 年なしの URL (`/archive`) は `archive/_index.tsx` が担当します。
 * 見出し・年チップは `Suspense` の外に置きます。年チップの現在地判定は
 * `useParams` から同期で導くため、ローダーの解決を待ちません。
 */
export default function ArchiveYearPage() {
  const { year: rawYear } = useParams<"/archive/:year">();
  const year = rawYear === undefined ? undefined : Number(rawYear);

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

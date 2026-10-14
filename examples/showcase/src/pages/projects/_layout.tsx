import { type ActionFunctionArgs, Outlet, redirect, useRoutePath } from "@pera1/react";
import * as React from "react";

import { listUsers } from "../../api/auth.js";
import { createProject, listProjectSummaries } from "../../api/projects.js";
import { ProjectListSkeleton } from "../../components/skeleton.js";

/**
 * プロジェクト一覧画面のデータを返します。
 *
 * 一覧の作成フォームはこのレイアウトのアクションで処理するため、子の一覧ページは
 * このローダーを親ローダー継承でそのまま受け取ります。
 */
export async function loader() {
  const [projects, users] = await Promise.all([listProjectSummaries(), listUsers()]);

  return { projects, users };
}

/**
 * プロジェクトの作成フォームを処理します。
 *
 * 成功時は作成したプロジェクトの詳細へリダイレクトします。入力不備は例外にせず
 * `{ error }` を返し、同じ画面に表示します。
 */
export async function action({ request }: ActionFunctionArgs) {
  const formData = request.formData;
  const name = String(formData.get("name") ?? "").trim();
  if (name === "") {
    return { error: "プロジェクト名を入力してください。" };
  }
  if (name.length > 200) {
    return { error: "プロジェクト名が長すぎます。" };
  }

  const description = String(formData.get("description") ?? "").trim();
  if (description.length > 2000) {
    return { error: "説明が長すぎます。" };
  }

  try {
    const project = await createProject(name, description);

    return redirect(`/projects/${project.id}`);
  } catch (error) {
    if (error instanceof Error) {
      return { error: error.message };
    }

    return { error: "プロジェクトの作成に失敗しました。" };
  }
}

/**
 * `/projects` 配下の共通レイアウトです。
 *
 * 見出しとサブナビだけを描画し、一覧・新規作成の本体は `Outlet` に任せます。
 * `Outlet` を `Suspense` で包むことで、子の一覧ローダーが suspend しても
 * 見出し・サブナビの骨格は残ります（ポップコーン UI）。
 */
export default function ProjectsLayout() {
  const path = useRoutePath();

  return (
    <section className="stack">
      <nav className="breadcrumb" aria-label="パンくず">
        <ol>
          <li>
            <a href="/">ホーム</a>
          </li>
          <li aria-hidden="true">/</li>
          {path.pathname === "/projects/new" ? (
            <>
              <li>
                <a href="/projects">プロジェクト</a>
              </li>
              <li aria-hidden="true">/</li>
              <li>
                <span aria-current="page">新規作成</span>
              </li>
            </>
          ) : (
            <li>
              <span aria-current="page">プロジェクト</span>
            </li>
          )}
        </ol>
      </nav>
      <div>
        <h1 className="page-title">プロジェクト</h1>
        <p className="page-lead">
          チームの仕事をプロジェクトごとに見渡し、タスクを育てる場所です。右のフォームから新しい仕事の場を作れます。
        </p>
      </div>
      <nav className="app-nav sub-nav" aria-label="プロジェクトのサブナビゲーション">
        <a href="/projects" aria-current={path.pathname === "/projects" ? "page" : undefined}>
          一覧
        </a>
        <a
          href="/projects/new"
          aria-current={path.pathname === "/projects/new" ? "page" : undefined}
        >
          新規作成
        </a>
      </nav>
      <React.Suspense fallback={<ProjectListSkeleton />}>
        <Outlet />
      </React.Suspense>
    </section>
  );
}

import {
  type ActionFunctionArgs,
  Outlet,
  redirect,
  useLoaderData,
  useRouteContext,
  useRoutePath,
  useRouterContext,
} from "@pera1/react";
import * as React from "react";

import { getCurrentUser, logout } from "../api/auth.js";
import { ROLE_LABELS } from "../api/db.js";
import { summarize } from "../api/tasks.js";
import AppErrorBoundary from "../components/error-boundary.js";
import PendingBar from "../components/pending-bar.js";
import NotFoundPage from "../components/not-found.js";
import { PageSkeleton } from "../components/skeleton.js";

/**
 * ヘッダーのナビゲーション項目です。
 *
 * 遷移先 (`href`) とアクティブ判定の接頭辞 (`match`) を分けています。たとえば
 * 「ファイル」は `/files/docs/README.md` へ遷移しますが、表示中のパスが `/files`
 * 配下ならアクティブにしたいため `match` に `/files` を指定します。
 */
const NAV_ITEMS: readonly {
  readonly href: string;
  readonly label: string;
  readonly match?: string;
}[] = [
  { href: "/", label: "ダッシュボード" },
  { href: "/projects", label: "プロジェクト" },
  { href: "/search", label: "検索" },
  { href: "/archive", label: "アーカイブ" },
  { href: "/files/docs/README.md", label: "ファイル", match: "/files" },
  { href: "/admin", label: "管理" },
];

/**
 * ヘッダー表示に必要な最小限のデータを返します。
 *
 * ユーザーはセッションから同期で、件数はインメモリー API から非同期で取得します。
 * 結果は `RootLayout` のヘッダー表示に使います。
 */
export async function loader() {
  const user = getCurrentUser();
  const stats = await summarize();

  return { user, projectCount: stats.projectCount, openTaskCount: stats.openTaskCount };
}

/**
 * ヘッダーから送信される操作を処理します。
 *
 * 現時点ではログアウトだけで、それ以外の intent は入力ミスとして扱います。
 */
export async function action({ request }: ActionFunctionArgs) {
  const intent = String(request.formData.get("intent") ?? "");
  if (intent === "logout") {
    logout();

    return redirect("/");
  }

  return { error: "不明な操作です。" };
}

/**
 * ヘッダー右側のユーザー表示です。
 *
 * ローダーの結果を `RootLayout` の直下で `React.use` すると、初回表示のサスペンド中は
 * 何も確定していないためルート全体が再試行され、ルーターのエンジンごと作り直されて
 * 読み込みが終わりません。`Suspense` で包んだ子コンポーネント側で読むことで、
 * レイアウトの骨格を先に確定させます。
 */
function HeaderUser() {
  const data = React.use(useLoaderData<typeof loader>());

  if (!data.user) {
    return (
      <a className="button button-primary" href="/login" data-testid="login-link">
        ログイン
      </a>
    );
  }

  return (
    <div className="user-chip">
      <span className="user-name">{data.user.name}</span>
      <span className={`badge ${data.user.role === "admin" ? "badge-warning" : "badge-info"}`}>
        {ROLE_LABELS[data.user.role]}
      </span>
      <form method="post" action="/">
        <input type="hidden" name="intent" value="logout" />
        <button type="submit" className="button button-ghost" data-testid="logout-button">
          ログアウト
        </button>
      </form>
    </div>
  );
}

/**
 * ページ本体の描画先です。
 *
 * `/` レイアウトはすべての URL に前方一致するため、未マッチの URL でもここまで届きます。
 * その場合 `outlet` は `null` になり、`notFoundComponent` は使われません
 * (真の未マッチにしか発火しないためです)。そこで `outlet` の有無を見て 404 を描画します。
 */
function RootOutlet() {
  const { outlet } = useRouteContext();
  if (!outlet) {
    return <NotFoundPage />;
  }

  return <Outlet />;
}

/**
 * アプリ全体の共通レイアウトです。
 *
 * ヘッダーの骨格・ナビ・フッターはローダーに依存せず即座に描画し、ユーザー表示だけを
 * 小さな `Suspense` に隔離します。ページ本体は `AppErrorBoundary` と `Suspense` の
 * 内側で描画します。
 */
export default function RootLayout() {
  const path = useRoutePath();

  // ルートが変わったらエラーバウンダリーを作り直し、再試行の結果が次の画面へ持ち越されないようにします。
  const entryId = useRouterContext((router) => router.currentEntry.id);

  return (
    <div className="app">
      <a className="skip-link" href="#main">
        本文へ移動
      </a>
      <header className="app-header">
        <div className="app-header-inner">
          <a className="app-brand" href="/">
            Pera Tasks
          </a>
          <nav className="app-nav" aria-label="メインナビゲーション">
            {NAV_ITEMS.map((item) => {
              // `/` は前方一致だとすべての URL に当たってしまうため、完全一致で判定します。
              const active =
                item.href === "/"
                  ? path.pathname === "/"
                  : path.pathname.startsWith(item.match ?? item.href);

              return (
                <a key={item.href} href={item.href} aria-current={active ? "page" : undefined}>
                  {item.label}
                </a>
              );
            })}
          </nav>
          <span aria-hidden="true" className="muted">
            |
          </span>
          <nav className="app-nav" aria-label="開発者向け">
            <a
              href="/lab"
              aria-current={path.pathname.startsWith("/lab") ? "page" : undefined}
            >
              Lab
            </a>
            <span className="badge" style={{ alignSelf: "center" }}>
              開発者向け
            </span>
          </nav>
          <React.Suspense
            fallback={
              <span className="user-chip">
                <span className="skeleton" style={{ width: "8rem", height: "1.5rem" }} aria-hidden="true" />
                <span className="visually-hidden">ユーザー情報を読み込み中</span>
              </span>
            }
          >
            <HeaderUser />
          </React.Suspense>
        </div>
        <PendingBar />
      </header>
      <main className="main" id="main">
        <AppErrorBoundary key={entryId}>
          <React.Suspense fallback={<PageSkeleton />}>
            <RootOutlet />
          </React.Suspense>
        </AppErrorBoundary>
      </main>
      <footer className="footer">
        <p>Pera Tasks — 小さなチームのためのタスク管理アプリです。</p>
        <p>
          <a href="/lab">開発者向け：ルーター実験室（Lab）</a>
          {" ｜ "}
          <a href="/projects">プロジェクト一覧へ</a>
        </p>
        <p>このアプリはルーター「pera1」の使用例です。</p>
      </footer>
    </div>
  );
}

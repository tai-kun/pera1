import { Outlet, useRoutePath } from "@pera1/react";
import * as React from "react";

/**
 * Lab のサブナビゲーション定義です。
 *
 * Lab はメインアプリの `BrowserRouter` 配下に同居しているため、
 * 遷移は素の `<a href>` で行えます (Navigation API が横取りします)。
 */
const LAB_LINKS = [
  { href: "/lab", label: "概要" },
  { href: "/lab/matching", label: "パターン" },
  { href: "/lab/core", label: "コア API" },
  { href: "/lab/errors", label: "エラー" },
  { href: "/lab/engine", label: "自作エンジン" },
  { href: "/lab/limits", label: "限界" },
] as const;

/**
 * ルーター実験室の共通レイアウトです。
 *
 * 現在地の判定には `useRoutePath()` を使います。
 * `useRoutePath()` はルーターのアクティブなエントリー URL を購読するため、
 * `<a>` による遷移でもアクティブ表示が正しく追従します。
 */
export default function LabLayout() {
  const path = useRoutePath();
  const current = path.pathname;

  return (
    <section className="lab-shell">
      <header className="lab-header">
        <nav className="breadcrumb" aria-label="パンくず">
          <ol>
            <li>
              <a href="/">ホーム</a>
            </li>
            <li aria-hidden="true">/</li>
            <li>
              <span aria-current="page">ルーター実験室</span>
            </li>
          </ol>
        </nav>
        <h1 className="page-title">ルーター実験室 (Lab)</h1>
        <p className="page-lead">
          開発者向けの実験室です。Pera Tasks を動かしている pera1 の公開 API
          を、その場で動かして確かめられます。Labページ自体はメインアプリと同じ履歴を共有します。履歴が独立しているのは/engineページ内のメモリーエンジンのミニアプリのみです。
        </p>
      </header>
      <nav className="lab-nav" aria-label="Lab のセクション" data-testid="lab-nav">
        {LAB_LINKS.map((link) => {
          // `/lab` 自体は前方一致に含めず、完全一致のときだけアクティブにします。
          const active =
            link.href === "/lab"
              ? current === "/lab"
              : current === link.href || current.startsWith(`${link.href}/`);

          return (
            <a
              key={link.href}
              href={link.href}
              className={active ? "is-active" : undefined}
              aria-current={active ? "page" : undefined}
            >
              {link.label}
            </a>
          );
        })}
      </nav>
      <Outlet />
    </section>
  );
}

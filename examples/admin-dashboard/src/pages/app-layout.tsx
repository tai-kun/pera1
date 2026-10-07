import { useNavigate } from "@pera1/react";
import type * as React from "react";

import { getCurrentUser, logout } from "../api/auth.js";

/**
 * 認証後の画面に共通の枠（Header + Sidebar + 本文）を提供します。
 *
 * ルート定義ではなく各ページがこのコンポーネントで内容を包む方式です。
 * `main` 要素は `RootLayout` 側にひとつだけ置き、ここでは重ねません。
 */
export default function AppLayout({ children }: { readonly children: React.ReactNode }) {
  const navigate = useNavigate();
  const user = getCurrentUser();

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <div>
      <header>
        <p>
          <a href="/dashboard">Admin Dashboard</a>
        </p>
        {user ? (
          <p>
            ログイン中: {user.name} ({user.role})
          </p>
        ) : null}
      </header>
      <nav aria-label="管理メニュー">
        <a href="/dashboard">Dashboard</a>
        {" | "}
        <a href="/users">Users</a>
        {" | "}
        <a href="/settings/profile">Settings</a>
        {" | "}
        <button type="button" onClick={handleLogout}>
          Logout
        </button>
      </nav>
      <div>{children}</div>
    </div>
  );
}

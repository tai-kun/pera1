import {
  type LoaderFunctionArgs,
  Outlet,
  redirectToLogin,
  useLoaderData,
  useNavigate,
} from "@pera1/react";
import * as React from "react";

import { getCurrentUser, logout } from "../api/auth.js";

export async function loader({ request }: LoaderFunctionArgs) {
  if (!getCurrentUser()) {
    return redirectToLogin(request);
  }
  // `/app` → `/app/dashboard` の誘導は `redirect` (routes.tsx) に宣言しています。
  // 完全一致のときだけ合成ローダーが `redirect()` を返し、子への遷移では再実行で通常データを返すため、キャッシュの再利用で固まりません。
  return { authenticated: true as const };
}

export default function AppLayout() {
  const data = React.use(useLoaderData<typeof loader>());
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <div style={{ display: "flex", gap: "24px" }}>
      <nav aria-label="アプリメニュー" style={{ minWidth: "180px" }}>
        <p style={{ fontWeight: "bold" }}>SaaS Project</p>
        <ul>
          <li>
            <a href="/app/dashboard">Dashboard</a>
          </li>
          <li>
            <a href="/app/projects">Projects</a>
          </li>
          <li>
            <a href="/app/notifications">Notifications</a>
          </li>
          <li>
            <a href="/app/settings">Settings</a>
          </li>
          <li>
            <button type="button" onClick={handleLogout}>
              Logout
            </button>
          </li>
        </ul>
      </nav>
      <div style={{ flex: 1 }}>
        <React.Suspense fallback={<p>読み込み中…</p>}>
          <Outlet />
        </React.Suspense>
      </div>
    </div>
  );
}

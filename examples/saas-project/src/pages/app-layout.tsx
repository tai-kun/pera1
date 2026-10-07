import {
  type LoaderFunctionArgs,
  Outlet,
  redirectToLogin,
  useNavigate,
} from "@pera1/react";
import * as React from "react";

import { getCurrentUser, logout } from "../api/auth.js";

export async function loader({ request }: LoaderFunctionArgs) {
  if (!getCurrentUser()) {
    return redirectToLogin(request);
  }

  return { authenticated: true as const };
}

export default function AppLayout() {
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

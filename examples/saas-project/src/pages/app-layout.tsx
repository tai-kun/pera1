import {
  type LoaderFunctionArgs,
  Outlet,
  RedirectResponse,
  redirect,
  useLoaderData,
  useNavigate,
  useRoutePath,
} from "@pera1/react";
import * as React from "react";

import { getCurrentUser, loginUrlFor, logout } from "../api/auth.js";
import RedirectTo, { RedirectResponse as RedirectResponseValue } from "../components/redirect-to.js";

export async function loader({ request }: LoaderFunctionArgs) {
  if (!getCurrentUser()) {
    return redirect(loginUrlFor(request.url.pathname, request.url.search));
  }
  // `/app` -> `/app/dashboard` の誘導は描画側で行います。
  // loader でパス名に応じて `redirect()` を返すと、その結果がキャッシュされ、
  // 子ルートへの遷移時にも再利用されてしまうためです。
  return { authenticated: true as const };
}

export default function AppLayout() {
  const { pathname } = useRoutePath();
  const data = React.use(useLoaderData<typeof loader>());
  const navigate = useNavigate();

  if (data instanceof RedirectResponse) {
    return <RedirectTo response={data} />;
  }
  if (pathname === "/app") {
    return <RedirectTo response={redirect("/app/dashboard")} />;
  }

  // `RedirectResponse` の再エクスポートが未使用扱いにならないための参照です。
  void RedirectResponseValue;

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

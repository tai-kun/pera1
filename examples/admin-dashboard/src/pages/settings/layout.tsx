import {
  type LoaderFunctionArgs,
  Outlet,
  RedirectResponse,
  redirect,
  useLoaderData,
  useRoutePath,
} from "@pera1/react";
import * as React from "react";

import { getCurrentUser, loginUrlFor } from "../../api/auth.js";
import AppLayout from "../app-layout.js";

export async function loader({ request }: LoaderFunctionArgs) {
  if (!getCurrentUser()) {
    return redirect(loginUrlFor(request.url.pathname, request.url.search));
  }
  // `/settings` → `/settings/profile` の誘導は `indexRedirect` (routes.tsx) に宣言しています。
  // 完全一致のときだけ合成ローダーが `redirect()` を返し、子への遷移では再実行で通常データを返すため、キャッシュの再利用で固まりません。
  return { authenticated: true as const };
}

export default function SettingsLayout() {
  const { pathname } = useRoutePath();
  const data = React.use(useLoaderData<typeof loader>());
  if (data instanceof RedirectResponse) {
    // loader の `redirect()` はエンジンが自動遷移させるため、ここでは何も描画しない。
    return null;
  }

  return (
    <AppLayout>
      <h2>設定</h2>
      <nav aria-label="設定">
        <a
          href="/settings/profile"
          aria-current={pathname === "/settings/profile" ? "page" : undefined}
        >
          Profile
        </a>
        {" | "}
        <a
          href="/settings/security"
          aria-current={pathname === "/settings/security" ? "page" : undefined}
        >
          Security
        </a>
      </nav>
      <Outlet />
    </AppLayout>
  );
}

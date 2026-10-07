import {
  type LoaderFunctionArgs,
  Outlet,
  redirectToLogin,
  useLoaderData,
  useRoutePath,
} from "@pera1/react";
import * as React from "react";

import { getCurrentUser } from "../../api/auth.js";
import AppLayout from "../app-layout.js";

export async function loader({ request }: LoaderFunctionArgs) {
  if (!getCurrentUser()) {
    return redirectToLogin(request);
  }
  // `/settings` 単体への遷移は子の index へ自動誘導されます。
  // 完全一致のときだけ合成ローダーが `redirect()` を返し、子への遷移では再実行で通常データを返すため、キャッシュの再利用で固まりません。
  return { authenticated: true as const };
}

export default function SettingsLayout() {
  const { pathname } = useRoutePath();
  const data = React.use(useLoaderData<typeof loader>());
  if (data === null) {
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

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
import RedirectTo from "../../components/redirect-to.js";
import AppLayout from "../app-layout.js";

export async function loader({ request }: LoaderFunctionArgs) {
  if (!getCurrentUser()) {
    return redirect(loginUrlFor(request.url.pathname, request.url.search));
  }
  // `/settings` -> `/settings/profile` の誘導は描画側で行います。
  // loader でパス名に応じて `redirect()` を返すと、その結果がキャッシュされ、
  // 子ルートへの遷移時にも再利用されてしまうためです。
  return { authenticated: true as const };
}

export default function SettingsLayout() {
  const { pathname } = useRoutePath();
  const data = React.use(useLoaderData<typeof loader>());
  if (data instanceof RedirectResponse) {
    // loader の `redirect()` はエンジンが自動遷移させるため、ここでは何も描画しない。
    return null;
  }
  if (pathname === "/settings") {
    return <RedirectTo response={redirect("/settings/profile")} />;
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

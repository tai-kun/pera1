import { type LoaderFunctionArgs, Outlet, redirectToLogin, useRoutePath } from "@pera1/react";

import { getCurrentUser } from "../../api/auth.js";
import AppLayout from "../app-layout.js";

export async function loader({ request }: LoaderFunctionArgs) {
  if (!getCurrentUser()) {
    return redirectToLogin(request);
  }

  return { authenticated: true as const };
}

export default function SettingsLayout() {
  const { pathname } = useRoutePath();

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

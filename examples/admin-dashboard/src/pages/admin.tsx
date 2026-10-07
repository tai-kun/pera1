import {
  type LoaderFunctionArgs,
  redirectToLogin,
  requireRole,
  useLoaderData,
} from "@pera1/react";
import * as React from "react";

import { getCurrentUser } from "../api/auth.js";
import AppLayout from "./app-layout.js";

export async function loader({ request }: LoaderFunctionArgs) {
  const user = getCurrentUser();
  if (!user) {
    return redirectToLogin(request);
  }
  // 認可の宣言は各ページへの分散ではなく、管理者専用ページの入口に集約します。
  const forbidden = requireRole(request, user, {
    roles: ["admin"],
    forbiddenPath: "/dashboard",
  });
  if (forbidden) {
    return forbidden;
  }
  return { user };
}

export default function AdminPage() {
  const data = React.use(useLoaderData<typeof loader>());
  if (data === null) {
    return null;
  }

  return (
    <AppLayout>
      <h2>管理者ページ</h2>
      <p>このページは管理者専用です。ようこそ、{data.user.name}さん。</p>
    </AppLayout>
  );
}

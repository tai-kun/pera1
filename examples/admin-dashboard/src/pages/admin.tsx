import {
  type LoaderFunctionArgs,
  RedirectResponse,
  redirect,
  useLoaderData,
} from "@pera1/react";
import * as React from "react";

import { getCurrentUser, loginUrlFor } from "../api/auth.js";
import AppLayout from "./app-layout.js";

export async function loader({ request }: LoaderFunctionArgs) {
  const user = getCurrentUser();
  if (!user) {
    return redirect(loginUrlFor(request.url.pathname, request.url.search));
  }
  if (user.role !== "admin") {
    return redirect("/dashboard");
  }
  return { user };
}

export default function AdminPage() {
  const data = React.use(useLoaderData<typeof loader>());
  if (data instanceof RedirectResponse) {
    // loader の `redirect()` はエンジンが自動遷移させるため、ここでは何も描画しない。
    return null;
  }

  return (
    <AppLayout>
      <h2>管理者ページ</h2>
      <p>このページは管理者専用です。ようこそ、{data.user.name}さん。</p>
    </AppLayout>
  );
}

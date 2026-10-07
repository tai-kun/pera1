import {
  type LoaderFunctionArgs,
  redirectToLogin,
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

  return { user };
}

export default function DashboardPage() {
  const data = React.use(useLoaderData<typeof loader>());

  return (
    <AppLayout>
      <h2>ダッシュボード</h2>
      <p>ようこそ、{data.user.name}さん。</p>
      <p>権限: {data.user.role}</p>
    </AppLayout>
  );
}

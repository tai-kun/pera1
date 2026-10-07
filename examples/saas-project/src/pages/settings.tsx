import {
  type LoaderFunctionArgs,
  redirectToLogin,
  useLoaderData,
} from "@pera1/react";
import * as React from "react";

import { getCurrentUser } from "../api/auth.js";

export async function loader({ request }: LoaderFunctionArgs) {
  const user = getCurrentUser();
  if (!user) {
    return redirectToLogin(request);
  }
  return { user };
}

export default function SettingsPage() {
  const data = React.use(useLoaderData<typeof loader>());
  if (data === null) {
    return null;
  }

  return (
    <>
      <h2>Settings</h2>
      <p>名前: {data.user.name}</p>
      <p>メールアドレス: {data.user.email}</p>
      <p>権限: {data.user.role}</p>
    </>
  );
}

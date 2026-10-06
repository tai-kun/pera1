import {
  type LoaderFunctionArgs,
  RedirectResponse,
  redirect,
  useLoaderData,
} from "@pera1/react";
import * as React from "react";

import { getCurrentUser, loginUrlFor } from "../../api/auth.js";

export async function loader({ request }: LoaderFunctionArgs) {
  const user = getCurrentUser();
  if (!user) {
    return redirect(loginUrlFor(request.url.pathname, request.url.search));
  }
  return { user };
}

export default function ProfilePage() {
  const data = React.use(useLoaderData<typeof loader>());
  if (data instanceof RedirectResponse) {
    // loader の `redirect()` はエンジンが自動遷移させるため、ここでは何も描画しない。
    return null;
  }

  return (
    <>
      <h3>プロフィール設定</h3>
      <p>名前: {data.user.name}</p>
      <p>メールアドレス: {data.user.email}</p>
      <p>権限: {data.user.role}</p>
    </>
  );
}

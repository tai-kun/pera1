import {
  type LoaderFunctionArgs,
  RedirectResponse,
  redirect,
  useLoaderData,
} from "@pera1/react";
import * as React from "react";

import { getCurrentUser, loginUrlFor } from "../api/auth.js";
import RedirectTo from "../components/redirect-to.js";

export async function loader({ request }: LoaderFunctionArgs) {
  const user = getCurrentUser();
  if (!user) {
    return redirect(loginUrlFor(request.url.pathname, request.url.search));
  }
  return { user };
}

export default function NotificationsPage() {
  const data = React.use(useLoaderData<typeof loader>());
  if (data instanceof RedirectResponse) {
    return <RedirectTo response={data} />;
  }

  return (
    <>
      <h2>Notifications</h2>
      <p>{data.user.name}さんへの通知は 2 件です。</p>
      <ul>
        <li>Apollo に新しいタスクが追加されました。</li>
        <li>Zephyr のレビュー依頼が届いています。</li>
      </ul>
    </>
  );
}

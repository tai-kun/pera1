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

export default function NotificationsPage() {
  const data = React.use(useLoaderData<typeof loader>());
  if (data === null) {
    return null;
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

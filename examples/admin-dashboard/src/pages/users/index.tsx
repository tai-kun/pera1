import {
  type LoaderFunctionArgs,
  redirectToLogin,
  useLoaderData,
} from "@pera1/react";
import * as React from "react";

import { getCurrentUser } from "../../api/auth.js";
import { listUsers } from "../../api/users.js";
import AppLayout from "../app-layout.js";

export async function loader({ request }: LoaderFunctionArgs) {
  if (!getCurrentUser()) {
    return redirectToLogin(request);
  }
  return { users: await listUsers() };
}

export default function UsersPage() {
  const data = React.use(useLoaderData<typeof loader>());
  if (data === null) {
    return null;
  }

  return (
    <AppLayout>
      <h2>ユーザー一覧</h2>
      <ul>
        {data.users.map((user) => (
          <li key={user.id}>
            <a href={`/users/${user.id}`}>{user.name}</a> ({user.email})
          </li>
        ))}
      </ul>
    </AppLayout>
  );
}

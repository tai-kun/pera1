import {
  type LoaderFunctionArgs,
  redirectToLogin,
  useLoaderData,
  useParams,
} from "@pera1/react";
import * as React from "react";

import { getCurrentUser } from "../../api/auth.js";
import { findUser } from "../../api/users.js";
import AppLayout from "../app-layout.js";

export async function loader({ params, request }: LoaderFunctionArgs) {
  if (!getCurrentUser()) {
    return redirectToLogin(request);
  }
  const userId = params["userId"];
  if (userId === undefined) {
    throw new Error("userId が指定されていません。");
  }

  return { profile: await findUser(userId) };
}

export default function UserDetailPage() {
  const params = useParams<"/users/:userId">();
  const data = React.use(useLoaderData<typeof loader>());
  if (!data.profile) {
    return (
      <AppLayout>
        <h2>ユーザーが見つかりません</h2>
        <p>ID: {params.userId} のユーザーは存在しません。</p>
        <p>
          <a href="/users">一覧に戻る</a>
        </p>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <h2>{data.profile.name}</h2>
      <p>メールアドレス: {data.profile.email}</p>
      <p>権限: {data.profile.role}</p>
      <p>ID: {params.userId}</p>
      <p>
        <a href="/users">一覧に戻る</a>
      </p>
    </AppLayout>
  );
}

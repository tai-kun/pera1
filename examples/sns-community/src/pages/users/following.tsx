import {
  type LoaderFunctionArgs,
  useLoaderData,
} from "@pera1/react";
import * as React from "react";

import { findUser, listUsers } from "../../api/users.js";

export async function loader({ params }: LoaderFunctionArgs) {
  const username = params["username"];
  if (username === undefined) {
    throw new Error("username が指定されていません。");
  }
  const user = await findUser(username);
  if (!user) {
    return { username, user: undefined, following: [] as const };
  }
  const all = await listUsers();
  const following = all.filter((candidate) => user.following.includes(candidate.username));
  return { username, user, following };
}

export default function UserFollowingPage() {
  const { username, user, following } = React.use(useLoaderData<typeof loader>());

  if (!user) {
    return (
      <section>
        <h3>ユーザーが見つかりません</h3>
        <p>ID: {username} のユーザーは存在しません。</p>
      </section>
    );
  }

  return (
    <section>
      <h3>Following</h3>
      {following.length === 0 ? (
        <p>フォロー中のユーザーはいません。</p>
      ) : (
        <ul>
          {following.map((followed) => (
            <li key={followed.username}>
              <a href={`/users/${followed.username}`}>{followed.name}</a>
              {" @"}
              {followed.username}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

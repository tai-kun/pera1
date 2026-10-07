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
    return { username, user: undefined, followers: [] as const };
  }

  const all = await listUsers();
  const followers = all.filter((candidate) => user.followers.includes(candidate.username));

  return { username, user, followers };
}

export default function UserFollowersPage() {
  const { username, user, followers } = React.use(useLoaderData<typeof loader>());

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
      <h3>Followers</h3>
      {followers.length === 0 ? (
        <p>フォロワーはいません。</p>
      ) : (
        <ul>
          {followers.map((follower) => (
            <li key={follower.username}>
              <a href={`/users/${follower.username}`}>{follower.name}</a>
              {" @"}
              {follower.username}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

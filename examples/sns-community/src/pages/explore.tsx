import { useLoaderData } from "@pera1/react";
import * as React from "react";

import { listUsers } from "../api/users.js";

export async function loader() {
  return listUsers();
}

export default function ExplorePage() {
  const users = React.use(useLoaderData<typeof loader>());

  return (
    <section>
      <h2>Explore</h2>
      <ul>
        {users.map((user) => (
          <li key={user.username}>
            <a href={`/users/${user.username}`}>{user.name}</a>
            {" @"}
            {user.username}
          </li>
        ))}
      </ul>
    </section>
  );
}

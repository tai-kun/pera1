import { Outlet, useLoaderData } from "@pera1/react";
import * as React from "react";

import { listConversations } from "../../api/conversations.js";

export async function loader() {
  return listConversations();
}

export default function MessagesLayout() {
  const conversations = React.use(useLoaderData<typeof loader>());

  return (
    <section>
      <h2>Messages</h2>
      <div style={{ display: "flex", gap: "16px" }}>
        <nav aria-label="会話一覧" style={{ minWidth: "200px" }}>
          <ul>
            {conversations.map((conversation) => (
              <li key={conversation.id}>
                <a href={`/messages/${conversation.id}`}>
                  Conversation {conversation.id} ({conversation.participants.join(", ")})
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div style={{ flex: 1 }}>
          <Outlet />
        </div>
      </div>
    </section>
  );
}

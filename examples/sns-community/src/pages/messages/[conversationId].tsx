import {
  type LoaderFunctionArgs,
  type ShouldReloadFunctionArgs,
  useLoaderData,
  useParams,
} from "@pera1/react";
import * as React from "react";

import { findConversation } from "../../api/conversations.js";

export async function loader({ params }: LoaderFunctionArgs) {
  const conversationId = params["conversationId"];
  if (conversationId === undefined) {
    throw new Error("conversationId が指定されていません。");
  }
  return { conversationId, conversation: await findConversation(conversationId) };
}

export function shouldReload(args: ShouldReloadFunctionArgs) {
  if (args.defaultShouldReload) {
    return true;
  }
  return args.currentParams["conversationId"] !== args.prevParams["conversationId"];
}

export default function ConversationPage() {
  const params = useParams<"/messages/:conversationId">();
  const { conversationId, conversation } = React.use(useLoaderData<typeof loader>());
  const displayId = conversation?.id ?? conversationId ?? params.conversationId;

  if (!conversation) {
    return (
      <article>
        <h3>会話が見つかりません</h3>
        <p>ID: {displayId} の会話は存在しません。</p>
        <p>
          <a href="/messages">会話一覧に戻る</a>
        </p>
      </article>
    );
  }

  return (
    <article>
      <h3>
        Conversation {conversation.id} ({conversation.participants.join(", ")})
      </h3>
      <ul>
        {conversation.messages.map((message) => (
          <li key={message.id}>
            <strong>{message.from}</strong>
            {": "}
            <span>{message.body}</span>
          </li>
        ))}
      </ul>
    </article>
  );
}

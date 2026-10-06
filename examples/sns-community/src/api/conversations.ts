export type Message = {
  readonly id: string;
  readonly from: string;
  readonly body: string;
};

export type Conversation = {
  readonly id: string;
  readonly participants: readonly string[];
  readonly messages: readonly Message[];
};

const conversations = new Map<string, Conversation>([
  [
    "a",
    {
      id: "a",
      participants: ["alice", "bob"],
      messages: [
        { id: "a-1", from: "alice", body: "こんにちは、Bob さん。先日の記事を読みました。" },
        { id: "a-2", from: "bob", body: "ありがとうございます、Alice さん。感想を聞かせてください。" },
      ],
    },
  ],
  [
    "b",
    {
      id: "b",
      participants: ["alice", "charlie"],
      messages: [
        { id: "b-1", from: "alice", body: "Charlie さん、旅行の写真を見ました。素敵ですね。" },
        { id: "b-2", from: "charlie", body: "ありがとうございます。今度ご一緒にいかがですか。" },
      ],
    },
  ],
  [
    "c",
    {
      id: "c",
      participants: ["bob", "dave"],
      messages: [
        { id: "c-1", from: "bob", body: "Dave さん、週末のライブに行きますか。" },
        { id: "c-2", from: "dave", body: "はい、一緒に行きましょう。駅で待ち合わせしましょう。" },
      ],
    },
  ],
]);

export async function listConversations(): Promise<Conversation[]> {
  return [...conversations.values()];
}

export async function findConversation(id: string): Promise<Conversation | undefined> {
  return conversations.get(id);
}

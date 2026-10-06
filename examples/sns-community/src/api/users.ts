export type User = {
  readonly username: string;
  readonly name: string;
  readonly bio: string;
  readonly followers: readonly string[];
  readonly following: readonly string[];
};

const users = new Map<string, User>([
  [
    "alice",
    {
      username: "alice",
      name: "Alice Tanaka",
      bio: "写真とコーヒーが好きです。",
      followers: ["bob", "charlie"],
      following: ["bob", "dave"],
    },
  ],
  [
    "bob",
    {
      username: "bob",
      name: "Bob Sato",
      bio: "TypeScript と OSS が好きです。",
      followers: ["alice"],
      following: ["alice", "charlie"],
    },
  ],
  [
    "charlie",
    {
      username: "charlie",
      name: "Charlie Suzuki",
      bio: "旅行と読書を楽しんでいます。",
      followers: ["alice", "bob"],
      following: ["dave"],
    },
  ],
  [
    "dave",
    {
      username: "dave",
      name: "Dave Yamada",
      bio: "ランニングと音楽が趣味です。",
      followers: ["alice", "charlie"],
      following: [],
    },
  ],
]);

export async function listUsers(): Promise<User[]> {
  return [...users.values()];
}

export async function findUser(username: string): Promise<User | undefined> {
  return users.get(username);
}

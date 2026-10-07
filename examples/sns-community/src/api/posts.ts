export type Post = {
  readonly id: string;
  readonly author: string;
  readonly body: string;
  readonly createdAt: string;
};

const POSTS: readonly Post[] = [
  {
    id: "alice-3",
    author: "alice",
    body: "お気に入りの喫茶店でチーズケーキを食べました。",
    createdAt: "2026-10-05T12:00:00.000Z",
  },
  {
    id: "alice-1",
    author: "alice",
    body: "今日はカフェで新しい豆を試しました。香りがとても良いです。",
    createdAt: "2026-10-01T09:00:00.000Z",
  },
  {
    id: "bob-1",
    author: "bob",
    body: "TypeScript 7.0 のリリースノートを読みました。型推論が速くなりそうです。",
    createdAt: "2026-10-01T10:00:00.000Z",
  },
  {
    id: "charlie-1",
    author: "charlie",
    body: "京都旅行の写真を整理中です。紅葉が楽しみです。",
    createdAt: "2026-10-02T09:00:00.000Z",
  },
  {
    id: "alice-2",
    author: "alice",
    body: "週末にフィルムカメラで撮った写真を現像に出しました。",
    createdAt: "2026-10-02T12:00:00.000Z",
  },
  {
    id: "dave-1",
    author: "dave",
    body: "朝ラン 10km 完了。新しいプレイリストが捗ります。",
    createdAt: "2026-10-03T06:00:00.000Z",
  },
  {
    id: "bob-2",
    author: "bob",
    body: "OSS に初めてコントリビュートしました。レビューに感謝です。",
    createdAt: "2026-10-03T09:00:00.000Z",
  },
  {
    id: "charlie-2",
    author: "charlie",
    body: "読書メモ: ミステリ小説を一気読みしました。",
    createdAt: "2026-10-04T09:00:00.000Z",
  },
  {
    id: "dave-2",
    author: "dave",
    body: "週末ライブのセットリストを予習しています。",
    createdAt: "2026-10-04T18:00:00.000Z",
  },
];

export async function listFeed(): Promise<Post[]> {
  return [...POSTS].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export async function listPostsByUser(username: string): Promise<Post[]> {
  return (await listFeed()).filter((post) => post.author === username);
}

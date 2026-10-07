export type Post = {
  readonly id: string;
  readonly title: string;
  readonly body: string;
  readonly category: string;
};

export type SearchResult = {
  readonly q: string;
  readonly page: number;
  readonly pageSize: number;
  readonly total: number;
  readonly totalPages: number;
  readonly posts: Post[];
};

const posts = new Map<string, Post>([
  [
    "1",
    {
      id: "1",
      title: "React 入門",
      body: "React の基本を学びます。コンポーネントと JSX の解説から始めましょう。",
      category: "react",
    },
  ],
  [
    "2",
    {
      id: "2",
      title: "React Hooks 実践",
      body: "useState と useEffect を使った React Hooks の実践ガイドです。",
      category: "react",
    },
  ],
  [
    "3",
    {
      id: "3",
      title: "React Router と pera1",
      body: "pera1 ルーターで React アプリの画面遷移を実装する方法を紹介します。",
      category: "react",
    },
  ],
  [
    "4",
    {
      id: "4",
      title: "TypeScript 基礎",
      body: "TypeScript の型注釈とインターフェースの入門記事です。",
      category: "typescript",
    },
  ],
  [
    "5",
    {
      id: "5",
      title: "TypeScript の高度な型",
      body: "ジェネリクスと条件型を使いこなす、中級者向けの TypeScript 解説です。",
      category: "typescript",
    },
  ],
  [
    "6",
    {
      id: "6",
      title: "CSS レイアウト入門",
      body: "Flexbox と Grid による CSS レイアウトの基礎を解説します。",
      category: "css",
    },
  ],
  [
    "7",
    {
      id: "7",
      title: "React Suspense とデータ取得",
      body: "Suspense と loader を使った React のデータ取得パターンを解説します。",
      category: "react",
    },
  ],
  [
    "8",
    {
      id: "8",
      title: "React と TypeScript の組み合わせ",
      body: "React アプリを TypeScript で型付けする方法を紹介します。",
      category: "typescript",
    },
  ],
  [
    "9",
    {
      id: "9",
      title: "CSS 設計と保守性",
      body: "保守しやすい CSS 設計の実践ガイドです。",
      category: "css",
    },
  ],
  [
    "10",
    {
      id: "10",
      title: "モダン CSS と React",
      body: "React プロジェクトで使うモダン CSS テクニックの紹介です。",
      category: "css",
    },
  ],
]);

export const PAGE_SIZE = 3;

export async function listPosts(): Promise<Post[]> {
  return [...posts.values()];
}

export async function findPost(id: string): Promise<Post | undefined> {
  return posts.get(id);
}

export async function listPostsByCategory(category: string): Promise<Post[]> {
  return [...posts.values()].filter((post) => post.category === category);
}

export async function searchPosts(q: string, page: number): Promise<SearchResult> {
  const keyword = q.trim().toLowerCase();
  const matched = keyword === ""
    ? [...posts.values()]
    : [...posts.values()].filter(
      (post) =>
        post.title.toLowerCase().includes(keyword) ||
        post.body.toLowerCase().includes(keyword) ||
        post.category.toLowerCase().includes(keyword),
    );
  const safePage = Number.isInteger(page) && page > 0 ? page : 1;
  const totalPages = Math.max(1, Math.ceil(matched.length / PAGE_SIZE));
  const currentPage = Math.min(safePage, totalPages);
  const start = (currentPage - 1) * PAGE_SIZE;

  return {
    q: q.trim(),
    page: currentPage,
    pageSize: PAGE_SIZE,
    total: matched.length,
    totalPages,
    posts: matched.slice(start, start + PAGE_SIZE),
  };
}

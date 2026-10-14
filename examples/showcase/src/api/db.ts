/**
 * ショーケースアプリのインメモリーデータ層です。
 *
 * 外部 API やストレージには接続せず、再読み込みで初期データに戻ります。
 * ローダーとアクションの流れに集中できるよう、わずかな遅延だけを挟みます。
 */

export type Role = "admin" | "member";

export type User = {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly role: Role;
};

export type Project = {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly color: string;
  readonly ownerId: string;
  readonly createdAt: string;
};

export type TaskStatus = "todo" | "doing" | "done";

export type TaskPriority = "low" | "normal" | "high";

export type Task = {
  readonly id: string;
  readonly projectId: string;
  readonly title: string;
  readonly status: TaskStatus;
  readonly priority: TaskPriority;
  readonly assigneeId?: string | undefined;
  readonly attachment?: { readonly name: string; readonly size: number } | undefined;
  readonly createdAt: string;
};

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  todo: "未着手",
  doing: "進行中",
  done: "完了",
};

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: "低",
  normal: "中",
  high: "高",
};

export const ROLE_LABELS: Record<Role, string> = {
  admin: "管理者",
  member: "メンバー",
};

/**
 * ローダーやアクションの完了を待つ間に `Suspense` と `useNavigation` を観察できるよう、
 * 一定の非同期遅延を再現します。
 *
 * @param ms 待機するミリ秒です。省略時は 120〜250ms の範囲でばらつきます。
 */
export function delay(ms?: number): Promise<void> {
  const duration = ms ?? 120 + Math.floor(Math.random() * 131);

  return new Promise((resolve) => {
    setTimeout(resolve, duration);
  });
}

const USERS: readonly User[] = [
  { id: "u-admin", name: "佐藤 管理者", email: "admin@example.com", role: "admin" },
  { id: "u-member", name: "鈴木 メンバー", email: "member@example.com", role: "member" },
  { id: "u-hanako", name: "高橋 花子", email: "hanako@example.com", role: "member" },
];

const PROJECTS: readonly Project[] = [
  {
    id: "p-router",
    name: "pera1 ルーター刷新",
    description: "matchRoutes の詳細度ソートと children 記法の検証を進めます。",
    color: "#6366f1",
    ownerId: "u-admin",
    createdAt: "2026-08-01T09:00:00.000Z",
  },
  {
    id: "p-docs",
    name: "ドキュメントサイト",
    description: "クイックスタートと API リファレンスを読みやすく整えます。",
    color: "#06b6d4",
    ownerId: "u-member",
    createdAt: "2026-08-20T09:00:00.000Z",
  },
  {
    id: "p-dx",
    name: "開発者体験の改善",
    description:
      "E2E テストとデザイントークンを整備して、素早くフィードバックを得られるようにします。",
    color: "#a855f7",
    ownerId: "u-admin",
    createdAt: "2026-09-10T09:00:00.000Z",
  },
];

const TASKS: readonly Task[] = [
  {
    id: "t-1",
    projectId: "p-router",
    title: "matchRoutes の詳細度ソートを整理する",
    status: "doing",
    priority: "high",
    assigneeId: "u-admin",
    createdAt: "2026-09-01T09:00:00.000Z",
  },
  {
    id: "t-2",
    projectId: "p-router",
    title: "children 記法のテストを追加する",
    status: "todo",
    priority: "normal",
    assigneeId: "u-member",
    attachment: { name: "children-memo.md", size: 1024 },
    createdAt: "2026-09-02T09:00:00.000Z",
  },
  {
    id: "t-3",
    projectId: "p-router",
    title: "裸パス自動誘導の挙動を検証する",
    status: "done",
    priority: "high",
    assigneeId: "u-admin",
    createdAt: "2026-09-03T09:00:00.000Z",
  },
  {
    id: "t-4",
    projectId: "p-docs",
    title: "クイックスタートを最新 API に更新する",
    status: "doing",
    priority: "normal",
    assigneeId: "u-member",
    createdAt: "2026-09-04T09:00:00.000Z",
  },
  {
    id: "t-5",
    projectId: "p-docs",
    title: "英語版の翻訳を見直す",
    status: "todo",
    priority: "low",
    assigneeId: "u-hanako",
    createdAt: "2026-09-05T09:00:00.000Z",
  },
  {
    id: "t-6",
    projectId: "p-dx",
    title: "AI エージェント向けストレステストを整備する",
    status: "todo",
    priority: "high",
    assigneeId: "u-admin",
    createdAt: "2026-09-06T09:00:00.000Z",
  },
  {
    id: "t-7",
    projectId: "p-dx",
    title: "CSS デザイントークンを定義する",
    status: "doing",
    priority: "normal",
    assigneeId: "u-member",
    attachment: { name: "tokens.json", size: 2048 },
    createdAt: "2026-09-07T09:00:00.000Z",
  },
  {
    id: "t-8",
    projectId: "p-dx",
    title: "README に機能マップを追記する",
    status: "done",
    priority: "normal",
    assigneeId: "u-hanako",
    createdAt: "2026-09-08T09:00:00.000Z",
  },
];

export const db = {
  users: new Map<string, User>(USERS.map((user) => [user.id, user])),
  projects: new Map<string, Project>(PROJECTS.map((project) => [project.id, project])),
  tasks: new Map<string, Task>(TASKS.map((task) => [task.id, task])),
  nextProjectId: PROJECTS.length + 1,
  nextTaskId: TASKS.length + 1,
};

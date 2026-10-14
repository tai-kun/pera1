import { db, delay, type Role, type User } from "./db.js";

/**
 * ログイン中のユーザー ID です。リロードでリセットされるインメモリーセッションです。
 */
let currentUserId: string | null = null;

const PASSWORDS = new Map<string, string>([
  ["admin@example.com", "pera1"],
  ["member@example.com", "pera1"],
  ["hanako@example.com", "pera1"],
]);

/**
 * 現在ログインしているユーザーを返します。
 *
 * ローダーとアクションの両方から同期的に呼べるよう、非同期にはしていません。
 */
export function getCurrentUser(): User | null {
  if (currentUserId === null) {
    return null;
  }

  return db.users.get(currentUserId) ?? null;
}

/**
 * メールアドレスとパスワードでログインします。
 *
 * @returns 認証に成功したユーザー、または `null` です。
 */
export async function login(email: string, password: string): Promise<User | null> {
  await delay();

  const expected = PASSWORDS.get(email);
  if (expected === undefined || expected !== password) {
    return null;
  }

  const user = [...db.users.values()].find((candidate) => candidate.email === email) ?? null;
  if (user) {
    currentUserId = user.id;
  }

  return user;
}

/**
 * ログアウトします。
 */
export function logout(): void {
  currentUserId = null;
}

/**
 * 全ユーザーを返します。管理画面で使います。
 */
export async function listUsers(): Promise<readonly User[]> {
  await delay();

  return [...db.users.values()];
}

/**
 * ユーザーのロールを変更します。
 *
 * @returns 更新後のユーザー、または見つからなかった場合は `null` です。
 */
export async function updateUserRole(id: string, role: Role): Promise<User | null> {
  await delay();

  const user = db.users.get(id);
  if (!user) {
    return null;
  }

  const updated: User = { ...user, role };
  db.users.set(id, updated);

  return updated;
}

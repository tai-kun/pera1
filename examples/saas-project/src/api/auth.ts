export type UserRole = "admin" | "user";

export type User = {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly role: UserRole;
};

type StoredUser = User & {
  readonly password: string;
};

// 簡易認証のためのインメモリーのユーザー DB です。
// 永続化はしません。
const users: readonly StoredUser[] = [
  { id: "1", name: "Admin", email: "admin@example.com", password: "password", role: "admin" },
  { id: "2", name: "Alice", email: "alice@example.com", password: "password", role: "user" },
];

const STORAGE_KEY = "pera1-saas-project:current-user";

/**
 * 現在ログイン中のユーザーを返します。
 *
 * リロードで JS のモジュール状態は消えるため、認証状態は `localStorage` に保存して復元します。
 */
export function getCurrentUser(): User | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const user = JSON.parse(raw) as Partial<User>;
    if (typeof user.id !== "string" || typeof user.email !== "string") {
      return null;
    }

    return {
      id: user.id,
      name: typeof user.name === "string" ? user.name : user.email,
      email: user.email,
      role: user.role === "admin" ? "admin" : "user",
    };
  } catch {
    return null;
  }
}

export async function login(email: string, password: string): Promise<User | undefined> {
  const found = users.find((user) => user.email === email && user.password === password);
  if (!found) {
    return undefined;
  }
  const user: User = { id: found.id, name: found.name, email: found.email, role: found.role };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  } catch {
    // 保存に失敗してもメモリー上のログインは継続しません。
    // 未ログインとして扱います。
    return undefined;
  }

  return user;
}

export function logout(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // 削除に失敗しても無視します。
  }
}

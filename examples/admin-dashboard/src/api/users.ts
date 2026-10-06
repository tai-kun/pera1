import type { UserRole } from "./auth.js";

export type DashboardUser = {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly role: UserRole;
};

// 管理対象のインメモリのユーザー一覧です。永続化はしません。
const users = new Map<string, DashboardUser>([
  ["1", { id: "1", name: "Admin", email: "admin@example.com", role: "admin" }],
  ["2", { id: "2", name: "Alice", email: "alice@example.com", role: "user" }],
  ["3", { id: "3", name: "Bob", email: "bob@example.com", role: "user" }],
  ["4", { id: "4", name: "Carol", email: "carol@example.com", role: "user" }],
  ["5", { id: "5", name: "Dave", email: "dave@example.com", role: "user" }],
]);

export async function listUsers(): Promise<DashboardUser[]> {
  return [...users.values()];
}

export async function findUser(id: string): Promise<DashboardUser | undefined> {
  return users.get(id);
}

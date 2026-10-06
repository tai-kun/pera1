export type Member = {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly role: string;
};

const membersByProject = new Map<string, Member[]>([
  [
    "apollo",
    [
      { id: "1", name: "Admin", email: "admin@example.com", role: "Owner" },
      { id: "2", name: "Alice", email: "alice@example.com", role: "Developer" },
    ],
  ],
  [
    "zephyr",
    [
      { id: "1", name: "Admin", email: "admin@example.com", role: "Owner" },
      { id: "3", name: "Bob", email: "bob@example.com", role: "Designer" },
    ],
  ],
  [
    "orion",
    [
      { id: "2", name: "Alice", email: "alice@example.com", role: "Owner" },
      { id: "4", name: "Carol", email: "carol@example.com", role: "Viewer" },
    ],
  ],
]);

const fallbackMembers: readonly Member[] = [
  { id: "1", name: "Admin", email: "admin@example.com", role: "Owner" },
];

export async function listMembers(projectId: string): Promise<Member[]> {
  return membersByProject.get(projectId) ?? [...fallbackMembers];
}

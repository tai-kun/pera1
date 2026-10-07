export type Project = {
  readonly id: string;
  readonly name: string;
  readonly description: string;
};

const initialProjects: readonly Project[] = [
  { id: "apollo", name: "Apollo", description: "月面着陸を目指す旗艦プロジェクトです。" },
  { id: "zephyr", name: "Zephyr", description: "軽量な風のように速い Web 体験を届けます。" },
  { id: "orion", name: "Orion", description: "夜空を観測するコミュニティー基盤を育てます。" },
];

const STORAGE_KEY = "pera1-saas-project:custom-projects";

const projects = new Map<string, Project>(initialProjects.map((project) => [project.id, project]));

/**
 * `localStorage` に保存された追加プロジェクトをメモリーに復元します。
 */
function restoreCustomProjects(): void {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return;
    }

    const parsed = JSON.parse(raw) as Partial<Project>[];
    if (!Array.isArray(parsed)) {
      return;
    }

    for (const item of parsed) {
      if (typeof item.id !== "string" || typeof item.name !== "string") {
        continue;
      }

      projects.set(item.id, {
        id: item.id,
        name: item.name,
        description: typeof item.description === "string" ? item.description : "",
      });
    }
  } catch {
    // 復元に失敗しても初期データで続行します。
  }
}

function persistCustomProjects(): void {
  try {
    const custom = [...projects.values()].filter(
      (project) => !initialProjects.some((initial) => initial.id === project.id),
    );
    localStorage.setItem(STORAGE_KEY, JSON.stringify(custom));
  } catch {
    // 保存に失敗してもメモリー上の作成は維持します。
  }
}

let restored = false;

function ensureRestored(): void {
  if (restored) {
    return;
  }

  restored = true;
  restoreCustomProjects();
}

export async function listProjects(): Promise<Project[]> {
  ensureRestored();

  return [...projects.values()];
}

export async function findProject(id: string): Promise<Project | undefined> {
  ensureRestored();

  return projects.get(id);
}

function slugify(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug === "" ? `project-${Date.now()}` : slug;
}

export async function createProject(name: string, description: string): Promise<Project> {
  ensureRestored();
  const base = slugify(name);
  let id = base;
  let suffix = 2;
  while (projects.has(id)) {
    id = `${base}-${suffix++}`;
  }
  const project: Project = { id, name: name.trim(), description: description.trim() };
  projects.set(id, project);
  persistCustomProjects();

  return project;
}

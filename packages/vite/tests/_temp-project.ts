import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { onTestFinished } from "vitest";

/**
 * 一時ディレクトリーにファイル構成を作成し、そのルートを返します。
 *
 * テスト終了時に自動で削除されます。
 */
export function createTempProject(files: Readonly<Record<string, string>>): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "pera1-vite-"));
  onTestFinished(() => fs.rmSync(root, { recursive: true, force: true }));

  for (const [relativePath, content] of Object.entries(files)) {
    const filePath = path.join(root, relativePath);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, content);
  }

  return root;
}

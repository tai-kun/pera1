import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { preview, type PreviewServer } from "vite";

import { BASE_URL, PREVIEW_PORT } from "./_server.js";

export default async function setup(): Promise<() => Promise<void>> {
  // 準備: ビルド成果物の存在を確認します。
  const root = fileURLToPath(new URL("..", import.meta.url));
  const distDir = path.resolve(root, "dist");
  if (!existsSync(distDir)) {
    throw new Error(
      `プレビューサーバーが起動しませんでした (port: ${PREVIEW_PORT})。ビルド成果物が見つかりません (${distDir})。先にビルドしてください。`,
    );
  }

  // 実行: 子プロセスではなく Vite API を直接利用します。
  // `pnpm exec vite preview` の spawn では、`pnpm` の解決・シグナル転送・パイプ詰まりなどの環境依存で起動判定がタイムアウトし、
  // 真の原因が隠れてしまうため、同一プロセスで待機完了まで起動します。
  let server: PreviewServer;
  try {
    server = await preview({
      root,
      logLevel: "warn",
      preview: {
        host: "127.0.0.1",
        port: PREVIEW_PORT,
        strictPort: true,
      },
    });
  } catch (ex) {
    const reason = ex instanceof Error ? ex.message : String(ex);
    throw new Error(
      `プレビューサーバーが起動しませんでした (port: ${PREVIEW_PORT})。原因: ${reason}`,
      { cause: ex },
    );
  }

  console.log(`プレビューサーバーを起動しました (${BASE_URL})。`);

  return async () => {
    await server.close();
  };
}

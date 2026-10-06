import { spawn, type ChildProcess } from "node:child_process";
import net from "node:net";
import { fileURLToPath } from "node:url";

import { BASE_URL, PREVIEW_PORT } from "./_server.js";

async function waitForPort(port: number, timeoutMs: number): Promise<void> {
  const startedAt = Date.now();
  for (;;) {
    const reachable = await new Promise<boolean>((resolve) => {
      const socket = net.connect(port, "127.0.0.1");
      socket.once("connect", () => {
        socket.end();
        resolve(true);
      });
      socket.once("error", () => {
        resolve(false);
      });
    });
    if (reachable) {
      return;
    }
    if (Date.now() - startedAt > timeoutMs) {
      throw new Error(`プレビューサーバーが起動しませんでした (port: ${port})。`);
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
}

export default async function setup(): Promise<() => Promise<void>> {
  // 準備
  const root = fileURLToPath(new URL("..", import.meta.url));
  const server: ChildProcess = spawn(
    "pnpm",
    ["exec", "vite", "preview", "--port", `${PREVIEW_PORT}`, "--strictPort"],
    { cwd: root, stdio: "pipe" },
  );

  try {
    await waitForPort(PREVIEW_PORT, 30_000);
  } catch (error) {
    server.kill();
    throw error;
  }

  console.log(`プレビューサーバーを起動しました (${BASE_URL})。`);

  return async () => {
    server.kill();
  };
}

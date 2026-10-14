import pera1 from "@pera1/vite-plugin";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [pera1(), react()],
  // ポート一元化: プレビューは 4180 固定とし、tests/_server.ts の BASE_URL（4180）と一致させる。
  preview: {
    port: 4180,
    strictPort: true,
  },
});

import pera1 from "@pera1/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [pera1(), react()],
});

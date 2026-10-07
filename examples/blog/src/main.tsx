import { configureSync, getConsoleSink } from "@logtape/logtape";
import { BrowserRouter } from "@pera1/react";
import * as React from "react";
import { createRoot } from "react-dom/client";

import { routes } from "./routes.js";
import NotFoundPage from "./pages/not-found.js";

configureSync({
  sinks: {
    console: getConsoleSink(),
  },
  loggers: [
    {
      category: ["@pera1/*"],
      sinks: ["console"],
      lowestLevel: "trace",
    },
  ],
});

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {/* 006: 404 は一次 API の `notFoundComponent` で描画する。`/*` の手書きは不要 (併存時は `/*` が優先)。 */}
    {/* 012: `scrollRestoration` はオプトインの先頭スクロール。省略時はブラウザー任せ。 */}
    <BrowserRouter routes={routes} notFoundComponent={NotFoundPage} scrollRestoration />
  </React.StrictMode>,
);

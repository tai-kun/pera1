import { configureSync, getConsoleSink } from "@logtape/logtape";
import { BrowserRouter } from "@pera1/react";
import * as React from "react";
import { createRoot } from "react-dom/client";

import { ROUTES } from "./routes.js";
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
    <BrowserRouter routes={ROUTES} notFoundComponent={NotFoundPage} scrollRestoration />
  </React.StrictMode>,
);

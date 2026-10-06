import { configureSync, getConsoleSink } from "@logtape/logtape";
import { BrowserRouter } from "@pera1/react";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { routes } from "./routes.js";

configureSync({
  sinks: {
    console: getConsoleSink(),
  },
  loggers: [
    {
      category: "@pera1/core",
      sinks: ["console"],
      lowestLevel: "debug",
    },
    {
      category: "@pera1/react",
      sinks: ["console"],
      lowestLevel: "debug",
    },
  ],
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter routes={routes} />
  </StrictMode>,
);

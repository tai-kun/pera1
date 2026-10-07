import { configureSync, getConsoleSink } from "@logtape/logtape";
import { BrowserRouter } from "@pera1/react";
import * as React from "react";
import { createRoot } from "react-dom/client";
import { routes } from "virtual:pera1/routes";

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
    <BrowserRouter routes={routes} />
  </React.StrictMode>,
);

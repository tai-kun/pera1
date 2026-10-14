import { configureSync, getConsoleSink } from "@logtape/logtape";
import { BrowserRouter } from "@pera1/react";
import * as React from "react";
import { createRoot } from "react-dom/client";
import { setGlobalConfig } from "valibot";

import NotFoundPage from "./components/not-found.js";
import { routes } from "virtual:pera1/routes";

import "./styles/base.css";
import "./styles/app.css";
import "./styles/lab.css";

// pera1 のエラーメッセージを日本語で表示します。
setGlobalConfig({ lang: "ja" });

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
    <BrowserRouter routes={routes} notFoundComponent={NotFoundPage} scrollRestoration />
  </React.StrictMode>,
);

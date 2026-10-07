import type { RouterRouteDefinition } from "@pera1/react";

import ContactPage, {
  action as deleteContactAction,
  loader as contactLoader,
} from "./pages/contacts/[id].js";
import ContactsPage from "./pages/contacts/index.js";
import ContactsLayout, {
  action as createContactAction,
  loader as contactsLoader,
} from "./pages/contacts/layout.js";
import HomePage from "./pages/index.js";
import RootLayout from "./pages/root.js";

// 404 は `main.tsx` の `notFoundComponent` (006 の一次 API) で処理するため、
// `path: "/*"` の手書きフォールバックは置いていない。明示的な `/*` 定義との
// 併存も可能で、その場合は `/*` の通常マッチが優先される。
export const routes: readonly RouterRouteDefinition[] = [
  {
    path: "/",
    index: true,
    component: HomePage,
  },
  {
    path: "/",
    component: RootLayout,
  },
  {
    path: "/contacts",
    index: true,
    component: ContactsPage,
  },
  {
    path: "/contacts",
    component: ContactsLayout,
    loader: contactsLoader,
    action: createContactAction,
  },
  {
    path: "/contacts/:id",
    component: ContactPage,
    loader: contactLoader,
    action: deleteContactAction,
  },
];

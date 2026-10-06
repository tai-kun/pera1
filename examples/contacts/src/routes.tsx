import type { RouterRouteDefinition } from "@pera1/react";

import ContactPage, {
  action as deleteContactAction,
  loader as contactLoader,
} from "./pages/contact.js";
import ContactsPage from "./pages/contacts-index.js";
import ContactsLayout, {
  action as createContactAction,
  loader as contactsLoader,
} from "./pages/contacts.js";
import HomePage from "./pages/home.js";
import NotFoundPage from "./pages/not-found.js";
import RootLayout from "./pages/root.js";

export const routes: readonly RouterRouteDefinition[] = [
  { path: "/", index: true, component: HomePage },
  { path: "/", component: RootLayout },
  { path: "/contacts", index: true, component: ContactsPage },
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
  { path: "/*", component: NotFoundPage },
];

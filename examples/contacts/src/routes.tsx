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

export const routes: readonly RouterRouteDefinition[] = [
  {
    path: "/",
    component: RootLayout,
    children: [
      {
        index: true,
        component: HomePage,
      },
      {
        path: "contacts",
        component: ContactsLayout,
        loader: contactsLoader,
        action: createContactAction,
        children: [
          {
            index: true,
            component: ContactsPage,
          },
          {
            path: ":id",
            component: ContactPage,
            loader: contactLoader,
            action: deleteContactAction,
          },
        ],
      },
    ],
  },
];

import type { RouterRouteDefinition } from "@pera1/react";

import AdminPage, { loader as adminLoader } from "./pages/admin.js";
import DashboardPage, { loader as dashboardLoader } from "./pages/dashboard.js";
import HomePage from "./pages/index.js";
import LoginPage, { action as loginAction, loader as loginLoader } from "./pages/login.js";
import NotFoundPage from "./pages/not-found.js";
import RootLayout from "./pages/root.js";
import SettingsLayout, { loader as settingsLoader } from "./pages/settings/layout.js";
import ProfilePage, { loader as profileLoader } from "./pages/settings/profile.js";
import SecurityPage, { loader as securityLoader } from "./pages/settings/security.js";
import UserDetailPage, { loader as userDetailLoader } from "./pages/users/[userId].js";
import UsersPage, { loader as usersLoader } from "./pages/users/index.js";

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
        path: "login",
        index: true,
        component: LoginPage,
        loader: loginLoader,
        action: loginAction,
      },
      {
        path: "dashboard",
        index: true,
        component: DashboardPage,
        loader: dashboardLoader,
      },
      {
        path: "users",
        index: true,
        component: UsersPage,
        loader: usersLoader,
      },
      {
        path: "users/:userId",
        component: UserDetailPage,
        loader: userDetailLoader,
      },
      {
        path: "settings",
        component: SettingsLayout,
        loader: settingsLoader,
        children: [
          {
            path: "profile",
            index: true,
            component: ProfilePage,
            loader: profileLoader,
          },
          {
            path: "security",
            index: true,
            component: SecurityPage,
            loader: securityLoader,
          },
        ],
      },
      {
        path: "admin",
        index: true,
        component: AdminPage,
        loader: adminLoader,
      },
    ],
  },
  {
    path: "/*",
    component: NotFoundPage,
  },
];

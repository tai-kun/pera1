import type { RouterRouteDefinition } from "@pera1/react";

import AppLayout, { loader as appLoader } from "./pages/app-layout.js";
import DashboardPage, { loader as dashboardLoader } from "./pages/dashboard.js";
import HomePage from "./pages/index.js";
import LoginPage, { action as loginAction, loader as loginLoader } from "./pages/login.js";
import NotFoundPage from "./pages/not-found.js";
import NotificationsPage, { loader as notificationsLoader } from "./pages/notifications.js";
import RootLayout from "./pages/root.js";
import SettingsPage, { loader as settingsLoader } from "./pages/settings.js";
import ProjectsPage, { loader as projectsLoader } from "./pages/projects/index.js";
import ProjectLayout, { loader as projectLoader } from "./pages/projects/layout.js";
import MembersPage, { loader as membersLoader } from "./pages/projects/members.js";
import NewProjectPage, { loader as newProjectLoader } from "./pages/projects/new.js";
import OverviewPage, { loader as overviewLoader } from "./pages/projects/overview.js";
import ProjectSettingsPage, { loader as projectSettingsLoader } from "./pages/projects/settings.js";
import TasksPage, { loader as tasksLoader } from "./pages/projects/tasks.js";

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
        path: "app",
        component: AppLayout,
        loader: appLoader,
        children: [
          {
            path: "dashboard",
            index: true,
            component: DashboardPage,
            loader: dashboardLoader,
          },
          {
            path: "projects",
            index: true,
            component: ProjectsPage,
            loader: projectsLoader,
          },
          {
            path: "projects/new",
            index: true,
            component: NewProjectPage,
            loader: newProjectLoader,
          },
          {
            path: "projects/:projectId",
            component: ProjectLayout,
            loader: projectLoader,
            children: [
              {
                path: "overview",
                index: true,
                component: OverviewPage,
                loader: overviewLoader,
              },
              {
                path: "tasks",
                index: true,
                component: TasksPage,
                loader: tasksLoader,
              },
              {
                path: "members",
                index: true,
                component: MembersPage,
                loader: membersLoader,
              },
              {
                path: "settings",
                index: true,
                component: ProjectSettingsPage,
                loader: projectSettingsLoader,
              },
            ],
          },
          {
            path: "notifications",
            index: true,
            component: NotificationsPage,
            loader: notificationsLoader,
          },
          {
            path: "settings",
            index: true,
            component: SettingsPage,
            loader: settingsLoader,
          },
        ],
      },
    ],
  },
  {
    path: "/*",
    component: NotFoundPage,
  },
];

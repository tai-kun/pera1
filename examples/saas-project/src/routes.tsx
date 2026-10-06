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
import ProjectLayout, {
  loader as projectLoader,
  shouldReload as projectShouldReload,
} from "./pages/projects/layout.js";
import MembersPage, {
  loader as membersLoader,
  shouldReload as membersShouldReload,
} from "./pages/projects/members.js";
import NewProjectPage, { loader as newProjectLoader } from "./pages/projects/new.js";
import OverviewPage, {
  loader as overviewLoader,
  shouldReload as overviewShouldReload,
} from "./pages/projects/overview.js";
import ProjectSettingsPage, {
  loader as projectSettingsLoader,
  shouldReload as projectSettingsShouldReload,
} from "./pages/projects/settings.js";
import TasksPage, {
  loader as tasksLoader,
  shouldReload as tasksShouldReload,
} from "./pages/projects/tasks.js";

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
    path: "/login",
    index: true,
    component: LoginPage,
    loader: loginLoader,
    action: loginAction,
  },
  {
    path: "/app",
    component: AppLayout,
    loader: appLoader,
  },
  {
    path: "/app/dashboard",
    index: true,
    component: DashboardPage,
    loader: dashboardLoader,
  },
  {
    path: "/app/projects",
    index: true,
    component: ProjectsPage,
    loader: projectsLoader,
  },
  {
    path: "/app/projects/new",
    index: true,
    component: NewProjectPage,
    loader: newProjectLoader,
  },
  {
    path: "/app/projects/:projectId",
    component: ProjectLayout,
    loader: projectLoader,
    shouldReload: projectShouldReload,
  },
  {
    path: "/app/projects/:projectId/overview",
    index: true,
    component: OverviewPage,
    loader: overviewLoader,
    shouldReload: overviewShouldReload,
  },
  {
    path: "/app/projects/:projectId/tasks",
    index: true,
    component: TasksPage,
    loader: tasksLoader,
    shouldReload: tasksShouldReload,
  },
  {
    path: "/app/projects/:projectId/members",
    index: true,
    component: MembersPage,
    loader: membersLoader,
    shouldReload: membersShouldReload,
  },
  {
    path: "/app/projects/:projectId/settings",
    index: true,
    component: ProjectSettingsPage,
    loader: projectSettingsLoader,
    shouldReload: projectSettingsShouldReload,
  },
  {
    path: "/app/notifications",
    index: true,
    component: NotificationsPage,
    loader: notificationsLoader,
  },
  {
    path: "/app/settings",
    index: true,
    component: SettingsPage,
    loader: settingsLoader,
  },
  {
    path: "/*",
    component: NotFoundPage,
  },
];

import type { RouterRouteDefinition } from "@pera1/react";

import ExplorePage, { loader as exploreLoader } from "./pages/explore.js";
import FeedPage, { loader as feedLoader } from "./pages/feed.js";
import HomePage from "./pages/index.js";
import ConversationPage, {
  loader as conversationLoader,
  shouldReload as conversationShouldReload,
} from "./pages/messages/[conversationId].js";
import MessagesIndexPage from "./pages/messages/index.js";
import MessagesLayout, { loader as messagesLoader } from "./pages/messages/layout.js";
import NotFoundPage from "./pages/not-found.js";
import NotificationsPage from "./pages/notifications.js";
import RootLayout from "./pages/root.js";
import UserFollowersPage, {
  loader as followersLoader,
  shouldReload as followersShouldReload,
} from "./pages/users/followers.js";
import UserFollowingPage, {
  loader as followingLoader,
  shouldReload as followingShouldReload,
} from "./pages/users/following.js";
import ProfileLayout, {
  loader as profileLoader,
  shouldReload as profileShouldReload,
} from "./pages/users/layout.js";
import UserPostsPage, {
  loader as userPostsLoader,
  shouldReload as userPostsShouldReload,
} from "./pages/users/posts.js";

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
    path: "/feed",
    index: true,
    component: FeedPage,
    loader: feedLoader,
  },
  {
    path: "/explore",
    index: true,
    component: ExplorePage,
    loader: exploreLoader,
  },
  {
    path: "/notifications",
    index: true,
    component: NotificationsPage,
  },
  {
    path: "/messages",
    index: true,
    component: MessagesIndexPage,
  },
  {
    path: "/messages",
    component: MessagesLayout,
    loader: messagesLoader,
  },
  {
    path: "/messages/:conversationId",
    component: ConversationPage,
    loader: conversationLoader,
    shouldReload: conversationShouldReload,
  },
  {
    path: "/users/:username",
    index: true,
    component: UserPostsPage,
    loader: userPostsLoader,
    shouldReload: userPostsShouldReload,
  },
  {
    path: "/users/:username",
    component: ProfileLayout,
    loader: profileLoader,
    shouldReload: profileShouldReload,
  },
  {
    path: "/users/:username/posts",
    index: true,
    component: UserPostsPage,
    loader: userPostsLoader,
    shouldReload: userPostsShouldReload,
  },
  {
    path: "/users/:username/followers",
    index: true,
    component: UserFollowersPage,
    loader: followersLoader,
    shouldReload: followersShouldReload,
  },
  {
    path: "/users/:username/following",
    index: true,
    component: UserFollowingPage,
    loader: followingLoader,
    shouldReload: followingShouldReload,
  },
  {
    path: "/*",
    component: NotFoundPage,
  },
];

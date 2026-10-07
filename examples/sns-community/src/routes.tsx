import type { RouterRouteDefinition } from "@pera1/react";

import ExplorePage, { loader as exploreLoader } from "./pages/explore.js";
import FeedPage, { loader as feedLoader } from "./pages/feed.js";
import HomePage from "./pages/index.js";
import ConversationPage, {
  loader as conversationLoader,
} from "./pages/messages/[conversationId].js";
import MessagesIndexPage from "./pages/messages/index.js";
import MessagesLayout, { loader as messagesLoader } from "./pages/messages/layout.js";
import NotFoundPage from "./pages/not-found.js";
import NotificationsPage from "./pages/notifications.js";
import RootLayout from "./pages/root.js";
import UserFollowersPage, {
  loader as followersLoader,
} from "./pages/users/followers.js";
import UserFollowingPage, {
  loader as followingLoader,
} from "./pages/users/following.js";
import ProfileLayout, {
  loader as profileLoader,
} from "./pages/users/layout.js";
import UserPostsPage, {
  loader as userPostsLoader,
} from "./pages/users/posts.js";

// `children` による明示的ネストで親子対応を構造で表します。
export const ROUTES: readonly RouterRouteDefinition[] = [
  {
    path: "/",
    component: RootLayout,
    children: [
      {
        index: true,
        component: HomePage,
      },
      {
        path: "feed",
        index: true,
        component: FeedPage,
        loader: feedLoader,
      },
      {
        path: "explore",
        index: true,
        component: ExplorePage,
        loader: exploreLoader,
      },
      {
        path: "notifications",
        index: true,
        component: NotificationsPage,
      },
      {
        path: "messages",
        component: MessagesLayout,
        loader: messagesLoader,
        children: [
          {
            index: true,
            component: MessagesIndexPage,
          },
          {
            path: ":conversationId",
            component: ConversationPage,
            loader: conversationLoader,
          },
        ],
      },
      {
        path: "users/:username",
        component: ProfileLayout,
        loader: profileLoader,
        children: [
          {
            index: true,
            component: UserPostsPage,
            loader: userPostsLoader,
          },
          {
            path: "posts",
            index: true,
            component: UserPostsPage,
            loader: userPostsLoader,
          },
          {
            path: "followers",
            index: true,
            component: UserFollowersPage,
            loader: followersLoader,
          },
          {
            path: "following",
            index: true,
            component: UserFollowingPage,
            loader: followingLoader,
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

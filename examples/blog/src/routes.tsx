import type { RouterRouteDefinition } from "@pera1/react";

import AboutPage from "./pages/about.js";
import CategoryPage, { loader as categoryLoader } from "./pages/categories/[category].js";
import HomePage from "./pages/index.js";
import NotFoundPage from "./pages/not-found.js";
import PostsLayout from "./pages/posts/layout.js";
import PostDetailPage, { loader as postLoader } from "./pages/posts/[postId].js";
import PostsPage, { loader as postsLoader } from "./pages/posts/index.js";
import RootLayout from "./pages/root.js";
import SearchPage, { loader as searchLoader } from "./pages/search.js";

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
    path: "/posts",
    index: true,
    component: PostsPage,
    loader: postsLoader,
  },
  {
    path: "/posts",
    component: PostsLayout,
  },
  {
    path: "/posts/:postId",
    component: PostDetailPage,
    loader: postLoader,
  },
  {
    path: "/categories/:category",
    component: CategoryPage,
    loader: categoryLoader,
  },
  {
    path: "/search",
    index: true,
    component: SearchPage,
    loader: searchLoader,
  },
  {
    path: "/about",
    index: true,
    component: AboutPage,
  },
  {
    path: "/*",
    component: NotFoundPage,
  },
];

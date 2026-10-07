import type { RouterRouteDefinition } from "@pera1/react";

import AboutPage from "./pages/about.js";
import CategoryPage, { loader as categoryLoader } from "./pages/categories/[category].js";
import HomePage from "./pages/index.js";
import PostsLayout from "./pages/posts/layout.js";
import PostDetailPage, { loader as postLoader } from "./pages/posts/[postId].js";
import PostsPage, { loader as postsLoader } from "./pages/posts/index.js";
import RootLayout from "./pages/root.js";
import SearchPage, { loader as searchLoader } from "./pages/search.js";

// `children` による明示的ネストの代表例。`processRoutes` がフラット化の際に
// 親パスと結合するため、従来の flat 配列と等価にマッチする。
// 404 は `main.tsx` の `notFoundComponent` (006 の一次 API) で処理するため、
// `path: "/*"` の手書きフォールバックは置いていない。明示的な `/*` 定義との
// 併存も可能で、その場合は `/*` の通常マッチが優先される。
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
        path: "posts",
        component: PostsLayout,
        children: [
          {
            index: true,
            component: PostsPage,
            loader: postsLoader,
          },
          {
            path: ":postId",
            component: PostDetailPage,
            loader: postLoader,
          },
        ],
      },
      {
        path: "categories/:category",
        component: CategoryPage,
        loader: categoryLoader,
      },
      {
        path: "search",
        index: true,
        component: SearchPage,
        loader: searchLoader,
      },
      {
        path: "about",
        index: true,
        component: AboutPage,
      },
    ],
  },
];

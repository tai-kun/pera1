# Pera Tasks (`@pera1/example-showcase`)

小さなチームのためのタスク管理アプリ「Pera Tasks」です。`pera1` の使用例として、製品として筋の通ったタスク管理を正面に立て、ルーターの仕組みを試せる開発者向け実験室 (Lab) を併設しています。`@pera1/react` と `@pera1/core` の公開 API をすべて実演し、ルーティングの機能と「限界」の両方を確認できます。

## 方向性（プロダクト定義）

- **何のアプリか**: 小規模チームがプロジェクトとタスクを管理する Web アプリ。開いて数秒で「タスク管理アプリだ」と分かることを目指します。
- **誰のためか**: 使う人＝チームメンバー（タスクの確認・更新・検索）。作る人＝pera1 を評価・学習する開発者（Lab で API を試せます）。
- **表と裏の分け方**: 製品画面の文言は製品言語で書き、API の解説が必要な箇所は「開発者向けメモ」であることが分かる書き方にします。Lab は製品ナビの一部ではなく「このアプリを動かしている pera1 を試す場」として案内します。
- **変えないもの**: pera1 の全機能を使うという目的、全ルート、全 API デモ、E2E で固定している見出し・ボタン・リンクの文言は維持します。

## できること

アプリ本体 (Pera Tasks: ダッシュボード / プロジェクト / タスク / 検索 / 認証 / 管理):

- ダッシュボード `/` — 統計値と最近のタスク
- プロジェクト一覧 `/projects` — 作成フォーム (layout の `action`)
- プロジェクト詳細 `/projects/:projectId` — タスクの絞り込み・追加・削除・状態変更・添付ファイル
- タスク詳細 `/projects/:projectId/tasks/:taskId` — 完了・再開・削除 (`redirect`)
- 検索 `/search` — GET 送信・`useRoutePath`・見出しへのフォーカス移動
- ログイン `/login` — `redirectTo` の往復と open redirect 防止
- 管理 `/admin` — `requireRole` によるガードとロール変更アクション
- 特殊ルート — 静的優先 `/projects/new`、省略可能パラメーター `/archive/:year?`、ワイルドカード `/files/*`
- 404 — 未マッチ URL の案内表示

ルーター実験室 (Lab: 開発者向け。Pera Tasks を動かしている pera1 を試す場):

- `/lab` — 全 API の機能マップと、コンテキスト直読みのライブインスペクター
- `/lab/matching` — `RoutePatternUtils` / `matchRoutes` のプレイグラウンド
- `/lab/core` — `RoutePath`・`redirect`・スキーマ・`expectHistoryEntry`・`formDataToHTMLFormElement`・`createRouter`・セレクター
- `/lab/errors` — エラークラス・エラーバウンダリー・アクションの例外・`setErrorMessage`
- `/lab/engine` — 自作メモリーエンジン (`IEngine` 実装) と `useScrollRestoration`
- `/lab/limits` — Navigation API 必須・SSR 非対応・遅延読み込み・履歴キャッシュ・ストレスランナー

## 技術スタック

- `React 19`
- `Vite 8`
- `@pera1/core` (ルーティング基盤、`matchRoutes` / `startLoaders` / エラーなど)
- `@pera1/react` (`BrowserRouter`、`Outlet`、各種フック)
- `@pera1/vite-plugin` (`src/pages` のファイル構成からルート定義を生成)
- `valibot` (スキーマ検証)
- `TypeScript` (型チェックのみ、`noEmit`)

## はじめ方

モノレポのルートから実行します。

```sh
pnpm install
# ワークスペースのパッケージは dist を参照するため、初回はビルドが必要です。
pnpm --filter @pera1/core build
pnpm --filter @pera1/react build
pnpm --filter @pera1/vite-plugin build
pnpm --filter @pera1/example-showcase dev
```

ブラウザーで `http://localhost:5173` を開きます。

## スクリプト

```sh
pnpm --filter @pera1/example-showcase build    # pera1-vite typegen && tsc --noEmit && vite build
pnpm --filter @pera1/example-showcase preview  # ビルド成果物のプレビュー
pnpm --filter @pera1/example-showcase test     # ビルド後、E2E (Playwright × vitest) を実行
```

E2E は `_global-setup.ts` がプレビューサーバーをポート `4180` (`http://127.0.0.1:4180`) で起動し、テストごとに独立したブラウザーコンテキストで実行します。

## API 機能マップ

`@pera1/react` の公開 API と実演箇所です (「API 機能マップ」そのものは `/lab` でも見られます)。

| API | 実演箇所 |
| --- | --- |
| `BrowserRouter` | `src/main.tsx` (`virtual:pera1/routes` の `routes` と `notFoundComponent`、`scrollRestoration` を渡す) |
| `Router` | `src/pages/lab/engine.tsx`、`src/pages/lab/errors.tsx` (自作エンジンのミニアプリ) |
| `Outlet` | `src/pages/_layout.tsx`、`src/pages/projects/_layout.tsx`、`src/pages/lab/_layout.tsx`、`src/pages/projects/$projectId/_layout.tsx` |
| `RouteContext` | `src/pages/lab/_index.tsx` (インスペクターで `React.use` 直読み) |
| `RouterContext` | `src/pages/lab/_index.tsx` (インスペクターで `React.use` 直読み) |
| `useLoaderData` | ローダーを持つ全画面 (`src/pages/**/*.tsx`) |
| `useActionData` | `src/pages/login.tsx`、`projects/_index.tsx`、`projects/$projectId/_index.tsx`、`projects/$projectId/tasks/$taskId.tsx`、`lab/core.tsx`、`src/lab/memory-routes.tsx` |
| `useNavigate` | `src/pages/_index.tsx`、`lab/limits/_index.tsx`、`lab/engine.tsx` |
| `useSubmit` | `src/pages/search.tsx`、`projects/$projectId/_index.tsx`、`projects/$projectId/tasks/$taskId.tsx`、`admin.tsx`、`src/lab/memory-routes.tsx`、`lab/limits/_index.tsx` |
| `useParams` | `src/pages/projects/$projectId/_index.tsx`、`src/pages/projects/$projectId/_layout.tsx` |
| `useFormAction` | `src/pages/projects/$projectId/_index.tsx`、`src/pages/projects/$projectId/tasks/$taskId.tsx` |
| `useRoutePath` | `src/pages/search.tsx`、`src/pages/lab/_layout.tsx`、`lab/core.tsx`、`lab/limits/_index.tsx` |
| `useRouteContext` | `src/pages/lab/_index.tsx`、`lab/core.tsx` |
| `useRouterContext` | `src/pages/_layout.tsx`、`src/pages/lab/_index.tsx`、`lab/core.tsx`、`lab/limits/_index.tsx` |
| `useNavigation` | `src/components/pending-bar.tsx`、`src/pages/projects/$projectId/_index.tsx`、`lab/limits/_index.tsx` |
| `useScrollRestoration` | `src/lab/memory-routes.tsx` (メモリーエンジン配下レイアウト) |

`@pera1/core` の公開 API と実演箇所です。

| API | 実演箇所 |
| --- | --- |
| `createRouter` | `src/pages/lab/core.tsx` (コントローラー単体の購読) |
| `matchRoutes` | `src/lab/memory-engine.ts`、`src/pages/lab/matching.tsx` |
| `initLoaders` | `src/lab/memory-engine.ts` (初回表示) |
| `startLoaders` | `src/lab/memory-engine.ts` (遷移時のキャッシュ判定) |
| `startAction` | `src/lab/memory-engine.ts` (フォーム送信) |
| `selectLoaderData` / `selectActionData` | `src/pages/lab/_index.tsx`、`lab/core.tsx` (独自フック) |
| `toNavigateArgs` / `toSubmitArgs` | `src/lab/memory-engine.ts` |
| `NavigationApiEngine` | `src/pages/lab/limits/_index.tsx` (対応チェック)、`BrowserRouter` の内部 |
| `IEngine` / 関連型 | `src/lab/memory-engine.ts` (実装契約) |
| `expectHistoryEntry` | `src/lab/memory-engine.ts`、`src/pages/lab/core.tsx`、`lab/errors.tsx` |
| `HistoryEntryIdSchema` / `HistoryEntryUrlSchema` | `src/pages/lab/core.tsx` |
| `RoutePath` | `src/lab/memory-engine.ts`、`src/pages/lab/core.tsx` |
| `RoutePatternUtils` | `src/pages/lab/matching.tsx` |
| `RouteRequest` | ローダー / アクションの引数、`src/pages/lab/core.tsx` の表示 |
| `redirect` / `RedirectResponse` | `src/pages/login.tsx`、`projects/$projectId/_index.tsx`、`projects/$projectId/tasks/$taskId.tsx`、`admin.tsx`、`lab/core.tsx` |
| `formDataToHTMLFormElement` | `src/pages/lab/core.tsx` (multipart の実送信) |
| `ErrorBase` / `ValidationErrorBase` | `src/pages/lab/errors.tsx` (継承関係の確認) |
| `setErrorMessage` | `src/pages/lab/errors.tsx` (差し替えと復元) |
| `UnreachableError` | `src/pages/lab/errors.tsx` (2 パターンのメッセージ) |
| `LoaderConditionError` | `src/pages/lab/errors.tsx` (不正な `shouldReload`) |
| `LoaderDataNotFoundError` | `src/pages/lab/errors.tsx` (ローダーなし階層で `useLoaderData`) |
| `RouterContextMissingError` / `RouteContextMissingError` | `src/pages/lab/errors.tsx` (インスタンスとメッセージの確認) |
| `UnexpectedValidationError` | `src/pages/lab/errors.tsx` / `lab/core.tsx` |
| `NavigationApiNotSupportedError` | `src/pages/lab/limits/_index.tsx`、`lab/errors.tsx` |
| `redirectToLogin` / `sanitizeRedirectTo` | `src/pages/login.tsx`、`src/pages/admin.tsx` |
| `requireRole` / `REDIRECT_TO_PARAM` | `src/pages/admin.tsx`、`src/pages/login.tsx` |
| 型 (`LoaderFunctionArgs` / `ActionFunctionArgs` / `RouteParams` / `LoaderData` / `ActionData` / `RouteDefinitionObject` / `ShouldReloadFunctionArgs` など) | 全体 (`src/pages/lab/matching.tsx` と `src/lab/memory-routes.tsx` で明示的に使用) |

## ルーティングの見どころ

ファイルベースルーティング (`@pera1/vite-plugin`) で、`src/pages` の構成から `virtual:pera1/routes` を生成します (`src/main.tsx` で `BrowserRouter` へ渡します)。

```text
src/pages/
├── _layout.tsx                         -> / (RootLayout)
├── _index.tsx                          -> / (index, Dashboard)
├── search.tsx                          -> /search
├── login.tsx                           -> /login
├── admin.tsx                           -> /admin
├── archive/
│   ├── _index.tsx                      -> /archive (index)
│   └── $year.tsx                       -> /archive/:year
├── files/
│   └── $.tsx                           -> /files/*
├── projects/
│   ├── _layout.tsx                     -> /projects
│   ├── _index.tsx                      -> /projects (index)
│   ├── new.tsx                         -> /projects/new
│   └── $projectId/
│       ├── _layout.tsx                 -> /projects/:projectId
│       ├── _index.tsx                  -> /projects/:projectId (index, shouldReload)
│       └── tasks/
│           └── $taskId.tsx             -> /projects/:projectId/tasks/:taskId
└── lab/
    ├── _layout.tsx                     -> /lab
    ├── _index.tsx                      -> /lab (index)
    ├── matching.tsx                    -> /lab/matching
    ├── core.tsx                        -> /lab/core
    ├── errors.tsx                      -> /lab/errors
    ├── engine.tsx                      -> /lab/engine
    └── limits/
        ├── _index.tsx                  -> /lab/limits (index)
        └── heavy.tsx                   -> /lab/limits/heavy (遅延チャンク)
```

- `lab/limits/heavy.tsx` は `limits` の子ではなく Lab レイアウト直下の兄弟ルートです（`/lab/limits/heavy`）。
- `_layout` — その階層のレイアウトになり、同じ階層のルートを子に持ちます (`/`、`​/projects`、`/projects/:projectId`、`/lab`)。
- `_index` — そのディレクトリーのインデックスルートです。
- モジュール形式 — 生成される定義はページモジュールの名前空間を spread し、`default` エクスポートをコンポーネントとして使います (`/lab/matching` など)。
- 静的優先 — `/projects/new` は `/projects/:projectId` より優先されます。
- 省略可能パラメーター — プラグインに `?` の記法がないため、`/archive/:year?` を `/archive` (`archive/_index.tsx`) と `/archive/:year` (`archive/$year.tsx`) の 2 ファイルで表します。
- ワイルドカード — `/files/*` (`files/$.tsx`) は残りのパスを `params["*"]` で受け取ります。
- `shouldReload` — `/projects/:projectId` のタスク一覧 (`projects/$projectId/_index.tsx`) に定義し、GET では既定判定を尊重しつつ `?force=1` で強制再取得します。POST 後は常に再取得されます。
- 履歴エントリー単位のキャッシュ — 同一エントリーへの戻り（Back）ではキャッシュを再利用し、別エントリー・`?force=1`等の新規pushでは`shouldReload`の判定次第で再実行されます。

## ルートの型生成

`@pera1/vite-plugin` はルートファイルごとに `.pera1/types/<パス>/+types/<ファイル名>.d.ts` を生成します。`tsconfig.json` に `rootDirs` と `@pera1/vite-plugin/client` を追加しています。

```sh
pnpm --filter @pera1/example-showcase build  # 先に pera1-vite typegen を実行します
```

`npm run dev` では開発サーバーがファイルの追加・変更・削除を検知して自動で再生成します。

## 限界の実演

`/lab/limits` と `/lab` の各所で、pera1 が意図的に持たない機能と代替手段を実演します。

- SSR 非対応 — `document` / `window` / `navigation` 前提のため、サーバーでは描画できません。
- Navigation API 必須 — 未対応環境では `NavigationApiNotSupportedError`。自作エンジンへ差し替え可能です (`/lab/engine`)。
- 404 の落とし穴 — `notFoundComponent` は catch-all レイアウト構成では発火しません (後述)。
- グローバルな進行状態 — `useNavigation` が返すのは遷移状態のみで、キャンセル UI などは自前です。
- 遅延読み込み — 標準機構はなく、`React.lazy` のラッパー (`src/lab/lazy-pages.tsx`) で補います。
- 型の広がり — `useParams()` はパターンを知らないため `string | undefined` になります。
- 履歴キャッシュ — エントリー単位のため、同じ URL でもエントリーが違えば再利用されません。
- ストレスランナー — 100 連続 navigate・Back/Forward 50 往復・二重送信を実行し、エラーゼロを確認します。

## テスト

`examples/blog` と同じ Playwright × vitest 構成です。テストは 3 ファイルに分かれています。

| ファイル | 内容 |
| --- | --- |
| `tests/showcase.e2e.test.ts` | アプリ本体の主要フロー (一覧・詳細・検索・認証・404 など) |
| `tests/lab.e2e.test.ts` | Lab の各実験の操作と結果表示 |
| `tests/showcase.agent-stress.e2e.test.ts` | 待機なし高速操作・連打・Back/Forward・リロード・不正 URL・2 タブのストレス |

```sh
pnpm --filter @pera1/example-showcase build
pnpm --filter @pera1/example-showcase exec vitest run --config ./vitest.e2e.config.ts
```

`test` スクリプトはビルドと E2E をまとめて実行します。検証は日本語の見出し・ラベル・role セレクターを中心にし、`data-testid` は補助に使います。

## データについて

`src/api/` の `Map` によるインメモリーストアを使用します。サーバーや `localStorage` とは連携しないため、再読み込みするとシード状態に戻ります。ローダーとアクションの非同期を見せるため、`delay()` で 120〜250ms の遅延を入れています。

シードデータは次のとおりです。

- ユーザー 3 名 (`admin@example.com` / `member@example.com` / `hanako@example.com`、パスワードは `pera1`)
- プロジェクト 3 件、タスク 8 件

## 404 の扱いの注意

`src/pages` に `$.tsx` を置かず、`BrowserRouter` の `notFoundComponent` に 404 ページ (`src/components/not-found.tsx`) を渡しています。ただし `/` の `_layout.tsx` がすべての URL に前方一致するため、未マッチの URL でもマッチ鎖が途切れず `notFoundComponent` は発火しません。このアプリでは `_layout.tsx` が `outlet === null` を検出して 404 を描画しています (`src/pages/_layout.tsx`)。`/lab/limits` の「404 の落とし穴」セクションで、この挙動ごと実演しています。

## デバッグログについて

`src/main.tsx` で LogTape を設定し、`@pera1/*` のデバッグログをコンソールに出力します。`debug` は既定で `console.debug` に送られ、DevTools では Verbose 扱いになります。

# 連絡先帳 (`@pera1/example-contacts`)

`pera1` の使用例としての連絡先管理アプリです。`@pera1/core` と `@pera1/react` を組み合わせたルーティング、`loader`、`action` によるデータの読み書きを確認できます。

## できること

- 連絡先の一覧表示 (`/contacts`)
- 連絡先の詳細表示 (`/contacts/:id`)
- フォーム送信による連絡先の追加 (`/contacts` への `POST`)
- `action` による連絡先の削除 (`/contacts/:id` への `POST`)

## 技術スタック

- `React 19`
- `Vite 8`
- `@pera1/core` (ルーティング基盤、`redirect` など)
- `@pera1/react` (`BrowserRouter`、`Outlet`、`useLoaderData` など)
- `TypeScript` (型チェックのみ、`noEmit`)

## はじめ方

モノレポのルートから実行します。

```sh
pnpm install
pnpm --filter @pera1/example-contacts dev
```

ブラウザーで `http://localhost:5173` を開きます。

その他のコマンドは次のとおりです。

```sh
pnpm --filter @pera1/example-contacts build
pnpm --filter @pera1/example-contacts preview
```

## ルーティング

`src/routes.tsx` で定義しています。

| パス                  | コンポーネント   | `loader` / `action`                                               |
| --------------------- | ---------------- | ----------------------------------------------------------------- |
| `/`                   | `HomePage`       | なし                                                              |
| `/`                   | `RootLayout`     | なし                                                              |
| `/contacts` (`index`) | `ContactsPage`   | なし                                                              |
| `/contacts`           | `ContactsLayout` | `loader` で一覧取得、`action` で追加後に詳細へ `redirect` します  |
| `/contacts/:id`       | `ContactPage`    | `loader` で 1 件取得、`action` で削除後に一覧へ `redirect` します |
| `/*`                  | `NotFoundPage`   | なし                                                              |

共通レイアウト (`RootLayout`、`ContactsLayout`) は `Outlet` で子ルートを表示します。`RootLayout` では `Suspense` で `loader` の読み込み状態を表示します。

## プロジェクト構成

```text
examples/contacts/
├── index.html
├── package.json
├── vite.config.ts
└── src/
    ├── main.tsx # BrowserRouter の起動と LogTape の設定をします
    ├── routes.tsx # ルート定義です
    ├── api/ # データ層です
        └── contacts.ts # インメモリーの連絡先ストアです
    └── pages/ # パス階層に合わせたネスト構成です
        ├── root.tsx # `/` の共通レイアウトです
        ├── index.tsx # `/` の index ページです
        ├── not-found.tsx # `/*` の 404 ページです
        └── contacts/ # `/contacts` 配下です
            ├── layout.tsx # 見出しと一覧取得・追加の loader / action です
            ├── index.tsx # 一覧と追加フォームです
            └── [id].tsx # `/contacts/:id` の詳細表示と取得・削除の loader / action です
```

## デバッグログについて

`src/main.tsx` で LogTape を設定し、`@pera1/*` のデバッグログをコンソールに出力します。`debug` は既定で `console.debug` に送られ、DevTools では Verbose 扱いになります。

## データについて

`src/api/contacts.ts` の `Map` によるインメモリーストアを使用します。サーバーや `localStorage` とは連携しないため、再読み込みすると初期データに戻ります。

初期データは次の 2 件です。

- Ada Lovelace (`ada@example.com`)
- Grace Hopper (`grace@example.com`)

追加時、名前が空の場合はエラーメッセージを表示し、`redirect` しません。

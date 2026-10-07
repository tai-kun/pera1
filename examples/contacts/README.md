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
- `@pera1/vite-plugin` (`src/pages` のファイル構成からルート定義を生成)
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

`src/pages` のファイル構成から `@pera1/vite-plugin` がルート定義を生成します。`src/main.tsx` では `virtual:pera1/routes` から `routes` を読み込み、`BrowserRouter` へ渡しています。

| ファイル                     | パス                  | コンポーネント   | `loader` / `action`                                               |
| ---------------------------- | --------------------- | ---------------- | ----------------------------------------------------------------- |
| `pages/_layout.tsx`          | `/`                   | `RootLayout`     | なし                                                              |
| `pages/_index.tsx`           | `/` (`index`)         | `HomePage`       | なし                                                              |
| `pages/contacts/_layout.tsx` | `/contacts`           | `ContactsLayout` | `loader` で一覧取得、`action` で追加後に詳細へ `redirect` します  |
| `pages/contacts/_index.tsx`  | `/contacts` (`index`) | `ContactsPage`   | なし                                                              |
| `pages/contacts/$id.tsx`     | `/contacts/:id`       | `ContactPage`    | `loader` で 1 件取得、`action` で削除後に一覧へ `redirect` します |
| `pages/$.tsx`                | `/*`                  | `NotFoundPage`   | なし                                                              |

共通レイアウト (`RootLayout`、`ContactsLayout`) は `Outlet` で子ルートを表示します。`RootLayout` では `Suspense` で `loader` の読み込み状態を表示します。`$.tsx` は既知の URL にも前方一致するため、マッチ鎖の中間では `outlet` をそのまま返し、どのルートにも一致しなかったときだけ 404 を表示します。

## ルートの型生成

`@pera1/vite-plugin` はルートファイルごとに `.pera1/types/<パス>/+types/<ファイル名>.d.ts` を生成します。ルートファイルは `./+types/<ファイル名>` から `Route` を import でき、`Route.Path`、`Route.Params`、`Route.LoaderArgs`、`Route.ActionArgs` などの型を参照できます。

```tsx
import type { Route } from "./+types/$id";

export async function loader({ params }: Route.LoaderArgs) {
  // params は { readonly id: string } になります。
}

export async function action({ params }: Route.ActionArgs) {
  // こちらも params.id が使えます。
}
```

型を import できるようにするため、`tsconfig.json` に `rootDirs` を追加しています。

```json
{
  "compilerOptions": {
    "rootDirs": [".", "./.pera1/types"]
  },
  "include": ["src", ".pera1/types"]
}
```

`npm run dev` では開発サーバーがファイルの追加・変更・削除を検知して自動で再生成します。CI などで型チェックだけを行う場合は、先に `pera1-vite typegen` を実行してください。`build` スクリプトでは `tsc` の前に実行しています。

## プロジェクト構成

```text
examples/contacts/
├── index.html
├── package.json
├── vite.config.ts # @pera1/vite-plugin プラグインを登録します
├── .pera1/ # ルート型の生成先です
│   ├── .gitignore # 生成物を git 管理対象外にします
│   └── types/ # rootDirs に指定するディレクトリーです
└── src/
    ├── main.tsx # BrowserRouter の起動と LogTape の設定をします
    ├── api/ # データ層です
        └── contacts.ts # インメモリーの連絡先ストアです
    └── pages/ # パス階層に合わせたネスト構成です
        ├── _layout.tsx # `/` の共通レイアウトです
        ├── _index.tsx # `/` の index ページです
        ├── $.tsx # 未マッチ時の 404 ページです
        └── contacts/ # `/contacts` 配下です
            ├── _layout.tsx # 見出しと一覧取得・追加の loader / action です
            ├── _index.tsx # 一覧と追加フォームです
            └── $id.tsx # `/contacts/:id` の詳細表示と取得・削除の loader / action です
```

## デバッグログについて

`src/main.tsx` で LogTape を設定し、`@pera1/*` のデバッグログをコンソールに出力します。`debug` は既定で `console.debug` に送られ、DevTools では Verbose 扱いになります。

## データについて

`src/api/contacts.ts` の `Map` によるインメモリーストアを使用します。サーバーや `localStorage` とは連携しないため、再読み込みすると初期データに戻ります。

初期データは次の 2 件です。

- Ada Lovelace (`ada@example.com`)
- Grace Hopper (`grace@example.com`)

追加時、名前が空の場合はエラーメッセージを表示し、`redirect` しません。

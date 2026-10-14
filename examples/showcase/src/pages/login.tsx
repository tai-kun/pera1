import {
  type ActionData,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
  REDIRECT_TO_PARAM,
  redirect,
  sanitizeRedirectTo,
  useActionData,
  useFormAction,
  useLoaderData,
  useNavigation,
} from "@pera1/react";
import * as React from "react";

import { getCurrentUser, login } from "../api/auth.js";
import { PageSkeleton } from "../components/skeleton.js";

/**
 * ログイン画面のローダーです。
 *
 * `redirectTo` はクエリーから受け取り、`sanitizeRedirectTo` で同一オリジンの
 * パスだけを通します。すでにログイン済みなら検証済みの遷移先へリダイレクトします。
 */
export async function loader({ request }: LoaderFunctionArgs) {
  const sanitized = sanitizeRedirectTo(request.url.searchParams.get(REDIRECT_TO_PARAM), "/");
  const redirectTo =
    new URL(sanitized, "http://localhost").pathname === "/login" ? "/" : sanitized;
  if (getCurrentUser()) {
    return redirect(redirectTo);
  }

  return { redirectTo };
}

/**
 * ログインのアクションです。
 *
 * フォームの hidden input に入っている `redirectTo` を信頼せず、ここでもう一度
 * `sanitizeRedirectTo` で検証します。open redirect 対策として必須の往復です。
 */
export async function action({ request }: ActionFunctionArgs) {
  const formData = request.formData;
  const sanitized = sanitizeRedirectTo(String(formData.get(REDIRECT_TO_PARAM) ?? ""), "/");
  const redirectTo =
    new URL(sanitized, "http://localhost").pathname === "/login" ? "/" : sanitized;
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  const user = await login(email, password);
  if (!user) {
    return { error: "メールアドレスまたはパスワードが正しくありません。", email, redirectTo };
  }

  return redirect(redirectTo);
}

/**
 * ログインエラーの表示です。`React.use` を呼ぶ部分を子コンポーネントに分けます。
 */
function LoginError() {
  const actionData = useActionData<typeof action>();
  if (!actionData || actionData.status !== "fulfilled") {
    return null;
  }

  return <LoginErrorText actionData={actionData} />;
}

/**
 * ログインエラーの本文です。
 */
function LoginErrorText({ actionData }: { readonly actionData: ActionData<typeof action> }) {
  const data = React.use(actionData);
  if (data && "error" in data) {
    return (
      <p
        id="login-error"
        className="error-text"
        role="alert"
        data-testid="login-error"
      >
        {data.error}
      </p>
    );
  }

  return null;
}

/**
 * ログインフォームとデモ資格情報だけを描画します。
 *
 * ローダー読みはこの子に限定し、親の見出し・導入文は suspend させません。
 * 失敗時の `email` は `useActionData` から同期的に取り出し、初期値として復元します。
 * `NinjaPromise` の `status` が `fulfilled` のときだけ `value` を読むため、
 * 送信中の `pending` では suspend せず、フォームは disabled 表示のまま残ります。
 */
function LoginBody() {
  const { redirectTo } = React.use(useLoaderData<typeof loader>());
  const formAction = useFormAction();
  const navigation = useNavigation();
  const actionData = useActionData<typeof action>();

  let initialEmail = "";
  let hasError = false;
  if (actionData?.status === "fulfilled") {
    const data = actionData.value;
    if (data !== null && typeof data === "object" && "error" in data) {
      hasError = true;
      const email = (data as { readonly email?: unknown }).email;
      if (typeof email === "string") {
        initialEmail = email;
      }
    }
  }

  const isSubmitting = navigation.state === "submitting";

  return (
    <LoginForm
      key={initialEmail}
      initialEmail={initialEmail}
      hasError={hasError}
      redirectTo={redirectTo}
      formAction={formAction}
      isSubmitting={isSubmitting}
    />
  );
}

/**
 * 実際のログインフォームです。
 *
 * `email` の復元は `defaultValue` + `key` 方式で行います。親の `LoginBody` が
 * `actionData` の `email` を `key` にしてこのフォームを作り直すため、
 * 失敗直後は送信した値が初期表示され、通常時は空から始まります。
 * `useState` は入力の制御ではなく、デモ資格情報ボタン (`fill-admin` /
 * `fill-member`) の種だけに使い、復元と競合させません。入力自体は
 * 非制御 (`defaultValue`) のため、入力中の `key` 変化によるフォーカス喪失もありません。
 */
function LoginForm({
  initialEmail,
  hasError,
  redirectTo,
  formAction,
  isSubmitting,
}: {
  readonly initialEmail: string;
  readonly hasError: boolean;
  readonly redirectTo: string;
  readonly formAction: string;
  readonly isSubmitting: boolean;
}) {
  const [emailSeed, setEmailSeed] = React.useState(initialEmail);
  const [passwordSeed, setPasswordSeed] = React.useState("");

  return (
    <div className="split-grid">
      <form
        className="card form-stack"
        method="post"
        action={formAction}
        data-testid="login-form"
      >
        <h2 className="card-title">資格情報を入力</h2>
        <input type="hidden" name={REDIRECT_TO_PARAM} value={redirectTo} />
        <label className="field">
          メールアドレス
          <input
            className="input"
            type="email"
            name="email"
            autoComplete="email"
            required
            defaultValue={emailSeed}
            key={`email-${emailSeed}`}
            aria-invalid={hasError ? true : undefined}
            aria-describedby={hasError ? "login-error" : undefined}
          />
        </label>
        <label className="field">
          パスワード
          <input
            className="input"
            type="password"
            name="password"
            autoComplete="current-password"
            required
            defaultValue={passwordSeed}
            key={`password-${passwordSeed}`}
            aria-invalid={hasError ? true : undefined}
            aria-describedby={hasError ? "login-error" : undefined}
          />
        </label>
        <LoginError />
        <button
          type="submit"
          className="button button-primary"
          disabled={isSubmitting}
          aria-disabled={isSubmitting}
        >
          ログインする
        </button>
      </form>

      <div className="card stack">
        <h2 className="card-title">デモ用の資格情報</h2>
        <div className="cluster">
          <button
            type="button"
            className="button"
            data-testid="fill-admin"
            onClick={() => {
              setEmailSeed("admin@example.com");
              setPasswordSeed("pera1");
            }}
          >
            管理者を入力
          </button>
          <button
            type="button"
            className="button"
            data-testid="fill-member"
            onClick={() => {
              setEmailSeed("member@example.com");
              setPasswordSeed("pera1");
            }}
          >
            メンバーを入力
          </button>
        </div>
        <p className="muted">admin@example.com / pera1（管理者）</p>
        <p className="muted">member@example.com / pera1（メンバー）</p>
        <p className="muted">
          検証済みの遷移先: <code data-testid="redirect-to-value">{redirectTo}</code>
        </p>
        <p>
          <a href="/admin">ログインせずに /admin へ行く（ガードの確認）</a>
        </p>
      </div>
    </div>
  );
}

/**
 * ログインページです。
 *
 * デモ用の資格情報をワンクリックで入力できるボタンを添え、`/admin` へのリンクから
 * ガードによるログイン誘導 (`redirectTo` の往復) も試せます。
 * 見出し・導入文は `Suspense` の外に置き、フォーム本体だけをスケルトンで
 * 穴埋めします（ポップコーン UI）。
 */
export default function LoginPage() {
  return (
    <section className="stack" aria-labelledby="login-heading">
      <div>
        <h1 id="login-heading" className="page-title">
          ログイン
        </h1>
        <p className="page-lead">
          チームに参加するにはログインしてください。ログイン後は、もといた画面へ戻ります。
        </p>
      </div>

      <React.Suspense fallback={<PageSkeleton />}>
        <LoginBody />
      </React.Suspense>
    </section>
  );
}

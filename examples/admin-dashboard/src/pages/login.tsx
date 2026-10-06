import {
  type ActionData,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
  RedirectResponse,
  redirect,
  useActionData,
  useLoaderData,
} from "@pera1/react";
import * as React from "react";

import { getCurrentUser, login } from "../api/auth.js";

function sanitizeRedirectTo(value: string | null): string {
  if (value && value.startsWith("/")) {
    return value;
  }
  return "/dashboard";
}

export async function loader({ request }: LoaderFunctionArgs) {
  const redirectTo = sanitizeRedirectTo(request.url.searchParams.get("redirectTo"));
  if (getCurrentUser()) {
    return redirect(redirectTo);
  }
  return { redirectTo };
}

export async function action({ request }: ActionFunctionArgs) {
  const email = String(request.formData.get("email") ?? "").trim();
  const password = String(request.formData.get("password") ?? "");
  const redirectTo = sanitizeRedirectTo(String(request.formData.get("redirectTo") ?? ""));
  if (email === "" || password === "") {
    return { error: "メールアドレスとパスワードを入力してください。" };
  }
  const user = await login(email, password);
  if (!user) {
    return { error: "メールアドレスまたはパスワードが正しくありません。" };
  }
  return redirect(redirectTo);
}

export default function LoginPage() {
  const data = React.use(useLoaderData<typeof loader>());
  if (data instanceof RedirectResponse) {
    // loader の `redirect()` はエンジンが自動遷移させるため、ここでは何も描画しない。
    return null;
  }

  return (
    <>
      <h2>ログイン</h2>
      <form method="post" action="/login">
        <input type="hidden" name="redirectTo" value={data.redirectTo} />
        <p>
          <label>
            メールアドレス
            <input name="email" type="email" autoComplete="email" />
          </label>
        </p>
        <p>
          <label>
            パスワード
            <input name="password" type="password" autoComplete="current-password" />
          </label>
        </p>
        <LoginError />
        <button type="submit">ログイン</button>
      </form>
      <p>管理者: admin@example.com / 一般ユーザー: alice@example.com (パスワードはいずれも password)</p>
    </>
  );
}

function LoginError() {
  const actionData = useActionData<typeof action>();
  if (!actionData) {
    return null;
  }
  return <ActionError actionData={actionData} />;
}

function ActionError({ actionData }: { actionData: ActionData<typeof action> }) {
  const data = React.use(actionData);
  if (data && "error" in data) {
    return <p role="alert">{data.error}</p>;
  }
  return null;
}

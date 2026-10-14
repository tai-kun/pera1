import {
  type ActionData,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
  redirectToLogin,
  requireRole,
  useActionData,
  useLoaderData,
  useNavigation,
  useSubmit,
} from "@pera1/react";
import * as React from "react";

import { getCurrentUser, listUsers, updateUserRole } from "../api/auth.js";
import { ROLE_LABELS, type User } from "../api/db.js";
import { TaskListSkeleton } from "../components/skeleton.js";

/**
 * 管理画面のローダーです。
 *
 * 未ログインなら `redirectToLogin`、ロール不一致なら `requireRole` が返す
 * `forbiddenPath` へのリダイレクトに従います。認可の分岐はこの 1 箇所に集約します。
 */
export async function loader({ request }: LoaderFunctionArgs) {
  const user = getCurrentUser();
  if (!user) {
    return redirectToLogin(request);
  }

  const forbidden = requireRole(request, user, { roles: ["admin"], forbiddenPath: "/login" });
  if (forbidden) {
    return forbidden;
  }

  return { user, users: await listUsers() };
}

/**
 * ロール変更のアクションです。
 *
 * アクションもローダーと同じガードを最初に通します。ロールは `admin` と `member`
 * だけを許可し、対象ユーザーが見つからなければ `{ error }` を返します。
 */
export async function action({ request }: ActionFunctionArgs) {
  const user = getCurrentUser();
  if (!user) {
    return redirectToLogin(request);
  }

  const forbidden = requireRole(request, user, { roles: ["admin"], forbiddenPath: "/login" });
  if (forbidden) {
    return forbidden;
  }

  const formData = request.formData;
  const intent = String(formData.get("intent") ?? "");
  if (intent !== "change-role") {
    return { error: "不明な操作です。" };
  }

  const userId = String(formData.get("userId") ?? "");
  const role = String(formData.get("role") ?? "");
  if (userId === "" || (role !== "admin" && role !== "member")) {
    return { error: "ユーザーとロールを指定してください。" };
  }

  if (userId === user.id && role === "member") {
    return { error: "自分自身のロールは変更できません。" };
  }

  const updated = await updateUserRole(userId, role);
  if (updated === null) {
    return { error: "ユーザーが見つかりません。" };
  }

  return { ok: true };
}

/**
 * 1 行分のロール変更フォームです。
 *
 * 送信は `useSubmit` の FormData で行い、変更後はローダーの再取得で表全体が更新されます。
 * `select` は `key` でロールに紐付け、再取得後も最新の値を表示します。
 */
function RoleForm({ user }: { readonly user: User }) {
  const submit = useSubmit();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  return (
    <form
      className="cluster"
      data-testid={`role-form-${user.id}`}
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        formData.set("intent", "change-role");
        formData.set("userId", user.id);
        submit(formData);
      }}
    >
      <select
        key={user.role}
        className="select"
        name="role"
        defaultValue={user.role}
        aria-label={`${user.name} のロール`}
      >
        <option value="admin">{ROLE_LABELS.admin}</option>
        <option value="member">{ROLE_LABELS.member}</option>
      </select>
      <button
        type="submit"
        className="button"
        disabled={isSubmitting}
        aria-disabled={isSubmitting}
        aria-label={`${user.name} のロールを変更`}
      >
        変更
      </button>
    </form>
  );
}

/**
 * アクション結果の表示です。`React.use` を呼ぶ部分を子コンポーネントに分けます。
 */
function AdminFeedback() {
  const actionData = useActionData<typeof action>();
  if (!actionData || actionData.status !== "fulfilled") {
    return null;
  }

  return <AdminFeedbackText actionData={actionData} />;
}

/**
 * アクション結果の本文です。
 */
function AdminFeedbackText({ actionData }: { readonly actionData: ActionData<typeof action> }) {
  const data = React.use(actionData);
  if (data && "error" in data) {
    return (
      <p className="error-text" role="alert" data-testid="admin-error">
        {data.error}
      </p>
    );
  }
  if (data) {
    return (
      <p className="success-text" role="status" data-testid="admin-ok">
        ロールを変更しました
      </p>
    );
  }

  return null;
}

/**
 * ユーザー表だけを描画します。
 *
 * ローダー読みはこの子に限定し、親の見出し・ガード説明は suspend させません。
 */
function AdminTable() {
  const { user, users } = React.use(useLoaderData<typeof loader>());

  return (
    <div
      className="table-wrap"
      tabIndex={0}
      role="region"
      aria-label="登録ユーザーとロールの一覧"
    >
      <table className="table" data-testid="admin-user-list">
        <caption className="muted">登録ユーザーとロールの一覧</caption>
        <thead>
          <tr>
            <th scope="col">名前</th>
            <th scope="col">メール</th>
            <th scope="col">ロール</th>
            <th scope="col">変更</th>
          </tr>
        </thead>
        <tbody>
          {users.map((target) => (
            <tr key={target.id}>
              <td>
                {target.name}{" "}
                {target.id === user.id ? (
                  <span className="badge badge-info">自分自身</span>
                ) : null}
              </td>
              <td>{target.email}</td>
              <td data-testid={`role-cell-${target.id}`}>
                <span
                  className={`badge ${target.role === "admin" ? "badge-warning" : "badge-info"}`}
                >
                  {ROLE_LABELS[target.role]}
                </span>
              </td>
              <td>
                <RoleForm user={target} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * 管理者専用ページです。
 *
 * ガードの流れを説明するカードと、ユーザー表のロール変更フォームを表示します。
 * 見出し・ガード説明は `Suspense` の外に置き、表だけをスケルトンで穴埋めします。
 */
export default function AdminPage() {
  return (
    <section className="stack" aria-labelledby="admin-heading">
      <div>
        <h1 id="admin-heading" className="page-title">
          管理
        </h1>
        <p className="page-lead">メンバーの役割を管理します。このページは管理者だけが開けます。</p>
      </div>

      <section className="card" aria-labelledby="guard-note-heading">
        <h2 id="guard-note-heading" className="card-title">
          ガードの流れ
        </h2>
        <p>このページは管理者だけが開けます。</p>
        <details>
          <summary>
            <span className="badge">開発者向けメモ</span> ガードの実装メモ
          </summary>
          <ul className="list">
            <li className="list-item">
              未ログイン → `redirectToLogin` が `/login?redirectTo=...`
              へ誘導し、ログイン後に復帰します。
            </li>
            <li className="list-item">
              メンバーでログイン → `requireRole` が `forbiddenPath` (`/login`) へ送ります。
            </li>
            <li className="list-item">管理者でログイン → この表からロールを変更できます。</li>
          </ul>
        </details>
      </section>

      <React.Suspense fallback={<TaskListSkeleton />}>
        <AdminTable />
      </React.Suspense>

      <AdminFeedback />
    </section>
  );
}

import { type ActionData, useActionData, useNavigation, useRouteContext } from "@pera1/react";
import * as React from "react";

import type { action as projectsAction } from "./_layout.js";

/**
 * この画面から送信した作成フォームのエラー表示です。
 *
 * 送信先は `/projects` のレイアウトアクションなので、`useActionData` には
 * 親ルートの `projectsAction` の結果が流れてきます。
 */
function CreateProjectError() {
  const actionData = useActionData<typeof projectsAction>();
  if (!actionData || actionData.status !== "fulfilled") {
    return null;
  }

  return <CreateProjectErrorText actionData={actionData} />;
}

/**
 * 作成フォームのエラー本文です。
 */
function CreateProjectErrorText({
  actionData,
}: {
  readonly actionData: ActionData<typeof projectsAction>;
}) {
  const data = React.use(actionData);
  if (data && "error" in data) {
    return (
      <p className="error-text" role="alert" data-testid="project-new-error">
        {data.error}
      </p>
    );
  }

  return null;
}

/**
 * `/projects/new` のページです。
 *
 * `/projects/:projectId` とパターンが重なりますが、pera1 は静的セグメントの
 * 完全一致をパラメーターより優先するため、この画面が先にマッチします。
 * `projectId === "new"` のようなガードは不要です。
 */
export default function ProjectNewPage() {
  const route = useRouteContext();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  return (
    <section className="stack" data-testid="project-new-page">
      <h2 className="page-title">新しいプロジェクト（静的ルート）</h2>
      <p className="page-lead">新しい仕事の場を作ります。</p>
      <p>
        <span className="badge">開発者向けメモ</span>{" "}
        この URL は、静的ルートとパラメーターの優先関係の見本も兼ねています。
      </p>
      <div className="split-grid">
        <section className="card">
          <h3 className="card-title">静的ルートがパラメーターより優先されます</h3>
          <p className="muted">
            `/projects/new` は `/projects/:projectId` と同じセグメント数ですが、静的セグメントの
            完全一致が勝つためこちらが表示されます。`/projects/:projectId` 側のローダーや
            レイアウトは実行されません。
          </p>
          <dl className="detail-list">
            <dt>マッチしたパターン</dt>
            <dd>
              <code>{route.path}</code>
            </dd>
            <dt>実際の URL パス</dt>
            <dd>
              <code>{route.urlPath}</code>
            </dd>
          </dl>
        </section>

        <form
          className="card form-stack"
          method="post"
          action="/projects"
          data-testid="project-new-form"
        >
          <h3 className="card-title">その場で作成する</h3>
          <p className="muted">
            このフォームの送信先は `useFormAction` ではなく、明示した `/projects` です。
          </p>
          <label className="field">
            プロジェクト名
            <input className="input" name="name" placeholder="例: 静的な新規作成" />
          </label>
          <label className="field">
            説明
            <textarea
              className="textarea"
              name="description"
              rows={3}
              placeholder="任意で入力できます"
            />
          </label>
          <CreateProjectError />
          <button
            type="submit"
            className="button button-primary"
            disabled={isSubmitting}
            aria-disabled={isSubmitting}
          >
            作成する
          </button>
        </form>
      </div>
    </section>
  );
}

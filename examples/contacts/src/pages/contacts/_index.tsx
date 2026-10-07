import { type ActionData, useActionData, useLoaderData } from "@pera1/react";
import * as React from "react";

import type { action as contactsAction, loader as contactsLoader } from "./_layout.js";

export default function ContactsPage() {
  const contacts = React.use(useLoaderData<typeof contactsLoader>());

  return (
    <>
      <ul>
        {contacts.map((contact) => (
          <li key={contact.id}>
            <a href={`/contacts/${contact.id}`}>{contact.name}</a>
          </li>
        ))}
      </ul>
      <CreateContactForm />
    </>
  );
}

function CreateContactForm() {
  const actionData = useActionData<typeof contactsAction>();

  return (
    <form method="post" action="/contacts">
      <h3>連絡先を追加</h3>
      <label>
        名前
        <input name="name" />
      </label>
      <label>
        メールアドレス
        <input name="email" type="email" />
      </label>
      {actionData ? <ActionError actionData={actionData} /> : null}
      <button type="submit">追加</button>
    </form>
  );
}

function ActionError({ actionData }: { readonly actionData: ActionData<typeof contactsAction> }) {
  const data = React.use(actionData);
  if (data && "error" in data) {
    return <p role="alert">{data.error}</p>;
  }

  return null;
}

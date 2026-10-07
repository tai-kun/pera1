import { redirect, useLoaderData, useParams } from "@pera1/react";
import * as React from "react";

import { deleteContact, findContact } from "../../api/contacts.js";
import type { Route } from "./+types/$id";

export async function loader({ params }: Route.LoaderArgs) {
  const id = params["id"];
  const contact = await findContact(id);
  if (!contact) {
    throw new Error(`連絡先 ${id} は見つかりませんでした。`);
  }
  return contact;
}

export async function action({ params }: Route.ActionArgs) {
  await deleteContact(params["id"]);
  return redirect("/contacts");
}

export default function ContactPage() {
  const params = useParams<Route.Path>();
  const contact = React.use(useLoaderData<typeof loader>());

  return (
    <article>
      <h2>{contact.name}</h2>
      <p>{contact.email}</p>
      <p>ID: {params.id}</p>
      <p>
        <a href="/contacts">一覧に戻る</a>
      </p>
    </article>
  );
}

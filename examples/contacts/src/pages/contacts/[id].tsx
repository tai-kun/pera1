import {
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
  redirect,
  useParams,
  useLoaderData,
} from "@pera1/react";
import * as React from "react";

import { deleteContact, findContact } from "../../api/contacts.js";

export async function loader({ params }: LoaderFunctionArgs) {
  const id = params["id"];
  if (id === undefined) {
    throw new Error("id が指定されていません。");
  }
  const contact = await findContact(id);
  if (!contact) {
    throw new Error(`連絡先 ${id} は見つかりませんでした。`);
  }
  return contact;
}

export async function action({ params }: ActionFunctionArgs) {
  const id = params["id"];
  if (id === undefined) {
    throw new Error("id が指定されていません。");
  }
  await deleteContact(id);
  return redirect("/contacts");
}

export default function ContactPage() {
  const params = useParams<"/contacts/:id">();
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

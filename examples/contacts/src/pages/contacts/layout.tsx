import { type ActionFunctionArgs, Outlet, redirect } from "@pera1/react";

import { createContact, listContacts } from "../../api/contacts.js";

export async function loader() {
  return listContacts();
}

export async function action({ request }: ActionFunctionArgs) {
  const name = String(request.formData.get("name") ?? "").trim();
  const email = String(request.formData.get("email") ?? "").trim();
  if (name === "") {
    return { error: "名前を入力してください。" };
  }
  const contact = await createContact(name, email);
  return redirect(`/contacts/${contact.id}`);
}

export default function ContactsLayout() {
  return (
    <section>
      <h2>連絡先</h2>
      <Outlet />
    </section>
  );
}

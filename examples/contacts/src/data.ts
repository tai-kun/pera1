export type Contact = {
  readonly id: string;
  readonly name: string;
  readonly email: string;
};

const contacts = new Map<string, Contact>([
  ["1", { id: "1", name: "Ada Lovelace", email: "ada@example.com" }],
  ["2", { id: "2", name: "Grace Hopper", email: "grace@example.com" }],
]);

let nextId = contacts.size + 1;

export async function listContacts(): Promise<Contact[]> {
  return [...contacts.values()];
}

export async function findContact(id: string): Promise<Contact | undefined> {
  return contacts.get(id);
}

export async function createContact(name: string, email: string): Promise<Contact> {
  const contact = { id: String(nextId++), name, email };
  contacts.set(contact.id, contact);
  return contact;
}

export async function deleteContact(id: string): Promise<void> {
  contacts.delete(id);
}

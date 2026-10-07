import { describe, test } from "vitest";

import { createContact, deleteContact, findContact, listContacts } from "./contacts.js";

describe("listContacts", () => {
  test("初期の連絡先を返す", async ({ expect }) => {
    // 実行
    const result = await listContacts();

    // 検証
    expect(result.map((contact) => contact.name)).toStrictEqual(["Ada Lovelace", "Grace Hopper"]);
  });
});

describe("findContact", () => {
  test("存在する連絡先を返す", async ({ expect }) => {
    // 実行
    const result = await findContact("1");

    // 検証
    expect(result?.email).toBe("ada@example.com");
  });

  test("存在しない連絡先は undefined を返す", async ({ expect }) => {
    // 実行と検証
    expect(await findContact("unknown")).toBeUndefined();
  });
});

describe("createContact", () => {
  test("連番の id で連絡先を追加する", async ({ expect }) => {
    // 実行
    const created = await createContact("Alan Turing", "alan@example.com");

    // 検証
    expect(created.name).toBe("Alan Turing");
    expect(await findContact(created.id)).toStrictEqual(created);
  });
});

describe("deleteContact", () => {
  test("連絡先を削除する", async ({ expect }) => {
    // 準備
    const created = await createContact("To Delete", "delete@example.com");

    // 実行
    await deleteContact(created.id);

    // 検証
    expect(await findContact(created.id)).toBeUndefined();
  });
});

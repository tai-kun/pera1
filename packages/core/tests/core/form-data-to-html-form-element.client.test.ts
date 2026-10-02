import { test } from "vitest";

import formDataToHTMLFormElement from "../../src/core/form-data-to-html-form-element.js";

test("空の FormData を渡したとき、子要素を持たない非表示の form 要素が生成される", ({ expect }) => {
  // 準備
  const formData = new FormData();

  // 実行
  const result = formDataToHTMLFormElement(formData);

  // 検証
  expect(result.tagName).toBe("FORM");
  expect(result.style.display).toBe("none");
  expect(result.children.length).toBe(0);
});

test("文字列のデータが含まれる FormData を渡したとき、hidden タイプの input 要素に変換される", ({
  expect,
}) => {
  // 準備
  const formData = new FormData();
  formData.append("username", "test_user");

  // 実行
  const result = formDataToHTMLFormElement(formData);

  // 検証
  const inputs = Array.from(result.children) as HTMLInputElement[];
  const inputAttributes = inputs.map((input) => ({
    tagName: input.tagName,
    type: input.type,
    name: input.name,
    value: input.value,
  }));

  expect(inputAttributes).toStrictEqual([
    {
      tagName: "INPUT",
      type: "hidden",
      name: "username",
      value: "test_user",
    },
  ]);
});

test("ファイルデータが含まれる FormData を渡したとき、file タイプの input 要素に変換される", ({
  expect,
}) => {
  // 準備
  const formData = new FormData();
  const file = new File(["dummy content"], "document.pdf", {
    type: "application/pdf",
  });
  formData.append("upload_file", file);

  // 実行
  const result = formDataToHTMLFormElement(formData);

  // 検証
  const inputs = Array.from(result.children) as HTMLInputElement[];
  const inputAttributes = inputs.map((input) => ({
    tagName: input.tagName,
    type: input.type,
    name: input.name,
    fileName: input.files?.[0]?.name ?? null,
  }));

  expect(inputAttributes).toStrictEqual([
    {
      tagName: "INPUT",
      type: "file",
      name: "upload_file",
      fileName: "document.pdf",
    },
  ]);
});

test("複数の異なる型のデータが含まれる FormData を渡したとき、データの追加順序を維持して変換される", ({
  expect,
}) => {
  // 準備
  const formData = new FormData();
  formData.append("id", "123");
  formData.append("attachment", new File([""], "dummy.txt"));
  formData.append("status", "実行ive");

  // 実行
  const result = formDataToHTMLFormElement(formData);

  // 検証
  const inputs = Array.from(result.children) as HTMLInputElement[];
  const inputAttributes = inputs.map((input) => ({
    name: input.name,
    type: input.type,
    value: input.value,
    fileName: input.files?.[0]?.name ?? null,
  }));

  expect(inputAttributes).toStrictEqual([
    {
      name: "id",
      type: "hidden",
      value: "123",
      fileName: null,
    },
    {
      name: "attachment",
      type: "file",
      value: "C:\\fakepath\\dummy.txt",
      fileName: "dummy.txt",
    },
    {
      name: "status",
      type: "hidden",
      value: "実行ive",
      fileName: null,
    },
  ]);
});

test("空文字列のデータが含まれる FormData を渡したとき、value が空の hidden タイプの input 要素に変換される", ({
  expect,
}) => {
  // 準備
  const formData = new FormData();
  formData.append("note", "");

  // 実行
  const result = formDataToHTMLFormElement(formData);

  // 検証
  const inputs = Array.from(result.children) as HTMLInputElement[];
  const inputAttributes = inputs.map((input) => ({
    type: input.type,
    name: input.name,
    value: input.value,
  }));

  expect(inputAttributes).toStrictEqual([
    {
      type: "hidden",
      name: "note",
      value: "",
    },
  ]);
});

test("同一のキー名を持つ複数のデータが含まれる FormData を渡したとき、それぞれの値を持つ input 要素に変換される", ({
  expect,
}) => {
  // 準備
  const formData = new FormData();
  formData.append("tags", "frontend");
  formData.append("tags", "backend");

  // 実行
  const result = formDataToHTMLFormElement(formData);

  // 検証
  const inputs = Array.from(result.children) as HTMLInputElement[];
  const inputAttributes = inputs.map((input) => ({
    type: input.type,
    name: input.name,
    value: input.value,
  }));

  expect(inputAttributes).toStrictEqual([
    {
      type: "hidden",
      name: "tags",
      value: "frontend",
    },
    {
      type: "hidden",
      name: "tags",
      value: "backend",
    },
  ]);
});

test("サイズが 0 のファイルが含まれる FormData を渡したとき、ファイル情報が保持された file タイプの input 要素に変換される", ({
  expect,
}) => {
  // 準備
  const formData = new FormData();
  const emptyFile = new File([], "empty.txt");
  formData.append("empty_file", emptyFile);

  // 実行
  const result = formDataToHTMLFormElement(formData);

  // 検証
  const inputs = Array.from(result.children) as HTMLInputElement[];
  const inputAttributes = inputs.map((input) => ({
    type: input.type,
    name: input.name,
    fileName: input.files?.[0]?.name ?? null,
    fileSize: input.files?.[0]?.size ?? null,
  }));

  expect(inputAttributes).toStrictEqual([
    {
      type: "file",
      name: "empty_file",
      fileName: "empty.txt",
      fileSize: 0,
    },
  ]);
});

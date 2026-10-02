import type { ReadonlyFormData } from "./readonly-form-data.types.js";

/**
 * 読み取り専用のフォームデータを基に、プログラムによって仮想的な `HTMLFormElement` を動的に構築する関数です。
 *
 * 生成されたフォーム要素は画面上のレイアウトを崩さないよう非表示（`display: none`）に設定され、内包する各データは適切な `<input>` 要素にラップされてフォーム内に追加されます。
 *
 * @param formData 変換元となる読み取り専用のフォームデータです。
 * @returns 子要素としてデータが詰め込まれた、DOM に未配置の非表示 `HTMLFormElement` を返します。
 */
export default function formDataToHTMLFormElement(formData: ReadonlyFormData): HTMLFormElement {
  const form = document.createElement("form");

  // 画面のレンダリングや視覚的なレイアウトに影響を及ぼさないよう、非表示スタイルを強制します。
  form.style.display = "none";

  formData.forEach((value, name) => {
    const input = document.createElement("input");
    if (value instanceof File) {
      // DataTransfer オブジェクトを仲介役として利用し、FileList を安全に再構成します。
      const df = new DataTransfer();
      df.items.add(value);

      input.type = "file";
      input.name = name;
      input.files = df.files;
    } else {
      input.type = "hidden";
      input.name = name;
      input.value = value;
    }

    form.appendChild(input);
  });

  return form;
}

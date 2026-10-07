import { RedirectResponse, useNavigate } from "@pera1/react";
import * as React from "react";

/**
 * loader が返した `RedirectResponse` に従って画面遷移を実行します。
 *
 * @deprecated loader の `redirect()` はエンジンが自動遷移させるようになったため、
 * 新規のガードではこのコンポーネントは不要です。描画側では
 * loader のリダイレクトは解決されないプロミスとして扱われるため、描画側の分岐は不要です。
 * 本コンポーネントは、loader を介さない描画側での誘導
 * (`/app` → `/app/dashboard` など) と後方互換のために残しています。
 */
export default function RedirectTo({ response }: { response: RedirectResponse }) {
  const navigate = useNavigate();
  const destination = `${response.pathname}${response.search}${response.hash}`;
  const done = React.useRef(false);

  React.useEffect(() => {
    if (done.current) {
      return;
    }
    done.current = true;
    navigate(destination);
  }, [navigate, destination]);

  return null;
}

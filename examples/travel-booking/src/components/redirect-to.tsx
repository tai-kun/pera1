import { RedirectResponse, useNavigate } from "@pera1/react";
import * as React from "react";

export { RedirectResponse };

/**
 * loader が返した `RedirectResponse` に従って画面遷移を実行します。
 *
 * pera1 のエンジンはアクションの `redirect()` だけを自動処理し、
 * loader の `redirect()` はローダーデータとして渡すだけです。
 * そのためガードなどで loader が `redirect()` を返した場合は、
 * 描画側でこのコンポーネントを返して遷移を完了させます。
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

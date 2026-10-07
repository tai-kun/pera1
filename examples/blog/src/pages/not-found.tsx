import { useRouteContext } from "@pera1/react";

export default function NotFoundPage() {
  const { outlet } = useRouteContext();
  // `/*` は既知の URL にも前方一致するため、マッチ鎖の中間に位置することがあります。
  // その場合は子ツリーへ透過させ、どのルートにも一致しなかったとき（outlet が null）だけ 404 を表示します。
  if (outlet) {
    return outlet;
  }

  return (
    <div>
      <h2>ページが見つかりません</h2>
      <p>
        <a href="/">ホームに戻る</a>
      </p>
    </div>
  );
}

import { lazyPage } from "../../../lab/lazy-pages.js";

/**
 * `/lab/limits/heavy` の遅延ルートです。
 *
 * ファイルベースルーティングでは `src/pages` の構成がそのままルートになるため、
 * このファイル自体が `/lab/limits/heavy` に対応します。
 * pera1 には標準の遅延読み込み機構がないため、`React.lazy` のラッパー
 * (`src/lab/lazy-pages.tsx`) で別チャンクとして読み込みます。
 */
const HeavyPage = lazyPage(() => import("../../../lab/heavy-page.js"));

export default HeavyPage;

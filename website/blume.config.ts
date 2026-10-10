import { defineConfig } from "blume";
import { filesystem, githubReleases } from "blume/sources";

const PROJET_NAME = "pera1（pera-ichi）";
const GITHUB_REPO = "pera1";
const GITHUB_OWNER = "tai-kun";

export default defineConfig({
  content: {
    sources: [
      filesystem({
        root: "content",
      }),
      githubReleases({
        prefix: "changelog",
        owner: GITHUB_OWNER,
        repo: GITHUB_REPO,
      }),
    ],
  },

  title: PROJET_NAME,
  description: `Documentation for ${PROJET_NAME}`,
  deployment: {
    site: `https://${GITHUB_OWNER}.github.io`,
    base: `/${GITHUB_REPO}`,
  },
  navigation: {
    repo: `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}`,
    // タブのラベルは必ず en を一番上にしてください。
    // 既定の言語コードが und なので、ドキュメント以外のページでは英語版の UI にフォールバックされるようにします。
    tabs: [
      {
        label: {
          en: "Documents",
          ja: "ドキュメント",
        },
        path: "/",
      },
      {
        label: {
          en: "Changelog",
          ja: "変更履歴",
        },
        path: "/changelog",
      },
    ],
  },
  // 対応するロケール以外の言語コードを規定値にすることで、トップレベルのページが無いコンテンツのルーティングを可能にします。
  // ここでは ISO 639-2 で定義されている特殊コードの 1 つである und（言語不明）を採用しています。
  // und は Blume の内部処理をハックするために使用されているため、言語セレクターから theme.css で消します。
  i18n: {
    locales: [
      {
        code: "ja",
        label: "日本語",
      },
      {
        code: "en",
        label: "English",
      },
      {
        code: "und",
        label: "UNDETERMINED",
      },
    ],
    defaultLocale: "und",
  },
});

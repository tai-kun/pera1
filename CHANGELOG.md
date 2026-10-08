# Changelog

## v0.0.5

### 新機能

- ファイルルーティングを可能にする vite プラグインを追加 ([33e2693](https://github.com/tai-kun/pera1/commit/33e269331c272a482cacbe02c0af1431fe869d04))
- **core:** redirect指定を廃止し子のindexへ自動誘導 ([fd627c4](https://github.com/tai-kun/pera1/commit/fd627c4a8a5fd61853e17d8b9c815c87b724a8c9))
- **core:** indexRedirectをredirectに改名 ([5a8724c](https://github.com/tai-kun/pera1/commit/5a8724c42800c81f989e64ef1ef49e9f292e0a99))
- **react:** ナビゲーションUX基盤を追加 ([bf77842](https://github.com/tai-kun/pera1/commit/bf778424e7e729d2f98adb667b93ee46dfb2e377))
- **core:** 認証ガード公式ヘルパーを提供 ([e4dcd26](https://github.com/tai-kun/pera1/commit/e4dcd260b923e1f93181d1484e5aca25ba0b4002))
- **react:** 404一次API notFoundComponent を追加 ([8bf098f](https://github.com/tai-kun/pera1/commit/8bf098fdd40cb267377f680e234f4f24965f9901))
- **core:** indexRedirect による裸パス誘導APIを追加 ([50efa9a](https://github.com/tai-kun/pera1/commit/50efa9a385af031917ac373155c53f2b43011316))
- **core:** children による明示的ネストを導入 ([63e6755](https://github.com/tai-kun/pera1/commit/63e6755a4cb6d5aa8235fdc14aab6222d084c076))

### バグ修正

- **e2e:** プレビューサーバー起動を安定化し blog の 404 を修正 ([2cb3aae](https://github.com/tai-kun/pera1/commit/2cb3aae7b4e49220bc51e7c4fddc43bc1ad96f97))
- format, lint ([75acb82](https://github.com/tai-kun/pera1/commit/75acb82ed4b49f5f4a7d5d8fc59e89cbf738d085))
- **core:** loaderリダイレクトを未解決プロミスに戻す ([12c9a7e](https://github.com/tai-kun/pera1/commit/12c9a7ed095328165ea5d985f502c27233b6288e))
- **core:** loaderリダイレクトをnull解決に置き換え ([72b6cd8](https://github.com/tai-kun/pera1/commit/72b6cd859c0a89683684529676eb160369c0075f))
- **react:** 404警告をlogger経由の日本語化に変更 ([2c4bc0a](https://github.com/tai-kun/pera1/commit/2c4bc0ae6a7fdd551ae1dada1c3e1ba43777d739))
- **core:** index警告をlogger経由の日本語化に変更 ([c999337](https://github.com/tai-kun/pera1/commit/c9993372c8d50f6cba0fe9cdf575950adca77424))
- **core:** prevParams型を汎化しRouteParamsを再利用 ([8f6da46](https://github.com/tai-kun/pera1/commit/8f6da46df447600f1fe669d3ffd14e3ee35fa47f))
- **core:** loader redirect をコンポーネント側へ露出させない ([faec0f0](https://github.com/tai-kun/pera1/commit/faec0f0432e53cad027a4ce18364be8f9df1e589))
- **core:** static完全一致をparam前方一致より優先して除外 ([4420aba](https://github.com/tai-kun/pera1/commit/4420aba2a3e96c615a028e9ea9bcc78b4ca69584))
- **core:** shouldReload 既定値に params 変化を含める ([4edf37c](https://github.com/tai-kun/pera1/commit/4edf37c21558f8b4c89b11f4656c82763e155d5b))
- **core:** loader の redirect() を自動遷移させる ([6fcf50b](https://github.com/tai-kun/pera1/commit/6fcf50b46ea8cd23a34a1efb9597c5263ebe1958))
- 一般的な利用では core を使わなくていいようにする ([cc9f706](https://github.com/tai-kun/pera1/commit/cc9f706a4c829913d03d97ce9176ca47069a56df))
- 使用例の追加とそこで発生したバグの修正 ([2142a99](https://github.com/tai-kun/pera1/commit/2142a99278358757b4de5e9e2f79a905fc43d5f8))
- @pera1/react のテストで act 警告が出ないよう IS_REACT_ACT_ENVIRONMENT を設定 ([df96e08](https://github.com/tai-kun/pera1/commit/df96e0849e241235949ef56efd37f5b9fbd1bfe9))

### リファクタリング

- `@pera1/vite` を `@pera1/vite-plugin` に改名 ([d07cae7](https://github.com/tai-kun/pera1/commit/d07cae7b05b34acc0529d585004b528ffe6df0f7))
- 関数の引数を基本的にreadonly化 ([9e6cbdc](https://github.com/tai-kun/pera1/commit/9e6cbdc88d32cf408ee807c08269b399356dfcd2))
- 日本語を整える ([16cbeae](https://github.com/tai-kun/pera1/commit/16cbeaeb8f5d386255dcf4c8aeb5e92e7d1b7c87))
- **core:** 単発利用をRoutePatternUtils静的メソッドに統一 ([036109d](https://github.com/tai-kun/pera1/commit/036109daf343175679c6d523461fa0764597b775))

### ドキュメント

- とりあえず日本語だけ用意する ([cd19be5](https://github.com/tai-kun/pera1/commit/cd19be5c9a8fdfa0f3a11cb72c0581e32553d959))

### テスト

- blogのBack/Forwardストレスの白紙化フレークを修正 ([6474fc2](https://github.com/tai-kun/pera1/commit/6474fc2394c261081ce3f3a1e22f31d38a7fcf84))
- カバレッジ100%前提の低価値テストとゲートを撤去 ([5d5f716](https://github.com/tai-kun/pera1/commit/5d5f716088615c32093aa6a9d649f5517fbeec70))
- 内部関数を含めてユニットテストを拡充 ([4b22259](https://github.com/tai-kun/pera1/commit/4b2225980c57dc0d3465103b168c9ecc3fc9ec0c))
- 不要なものを削除 ([5c5e00c](https://github.com/tai-kun/pera1/commit/5c5e00c05b148b293a5159d457501c6051761c4d))

### ビルド・CI

- 改善 ([79d8a73](https://github.com/tai-kun/pera1/commit/79d8a736283f057dac0fddc66758ce4ac4e57769))
- 改善 ([af371d7](https://github.com/tai-kun/pera1/commit/af371d75d0ccf5f9ed18a378163c994709e284f7))
- 未登録パッケージのリリースを失敗させる ([94bbd54](https://github.com/tai-kun/pera1/commit/94bbd54e4fe58414ffdf35ebaec29a87bb3177d2))
- 修正 ([ee999de](https://github.com/tai-kun/pera1/commit/ee999deb12f668cecafa88cbf2224df661ad5275))
- 安全リリース ([6dcd07b](https://github.com/tai-kun/pera1/commit/6dcd07bcb8c0b111370d575fd414882d17311fb4))
- カバレッジ100%のゲートを導入 ([a01aa75](https://github.com/tai-kun/pera1/commit/a01aa75ac4e612a4ee1a09ef0559d0fa44726d33))
- e2e テストを追加 ([1c70766](https://github.com/tai-kun/pera1/commit/1c70766ced01858371c577d2b47491e3256f114d))

### その他

- `import * as React` に統一する ([94ae0f0](https://github.com/tai-kun/pera1/commit/94ae0f0d3e8857e25fc9eb166f45b772c5b2db38))
- リテラル定数・読み取り専用オブジェクトをUPPER_SNAKE_CASE化 ([aac6337](https://github.com/tai-kun/pera1/commit/aac6337b434bdd86a83c01c31946ecd0f9651cf4))
- 定義順序を型→非公開→公開に整理 ([ccc2e2c](https://github.com/tai-kun/pera1/commit/ccc2e2c5b5855f4b0c8b4d63fd26f5921ced7bc6))
- 非連続ifブロックの後に空行を挿入 ([c4cca1e](https://github.com/tai-kun/pera1/commit/c4cca1ea196ab95ee90da5fff42538e56790a88e))
- ifのブロック化をoxlintのcurlyで担保 ([d588801](https://github.com/tai-kun/pera1/commit/d588801827e034a89a5ee7d7c570e71a073b85cf))
- throwとreturnの前に空行を挿入 ([ae0bae7](https://github.com/tai-kun/pera1/commit/ae0bae7625a9ca77b3ed26d6cea3cb9bb01783ea))
- **vite:** 整形 ([12a17e1](https://github.com/tai-kun/pera1/commit/12a17e1ec09436423c5cf7e6c3e714576d965517))
- catch変数をexに統一 ([79279d5](https://github.com/tai-kun/pera1/commit/79279d5186791090874803de07763e39be79be35))
- e2e: ストレステストを追加 ([321e273](https://github.com/tai-kun/pera1/commit/321e27331517e0e9d6a6d1b4edaf787acc572586))
- リファクタリング ([57d17b0](https://github.com/tai-kun/pera1/commit/57d17b02e6d629adcb28efb5ff67419cd5fe0077))
- **core:** 空行を処理単位で整理 ([c64765e](https://github.com/tai-kun/pera1/commit/c64765e8f9d5957e1ca968b2019fe39f0c9b14ab))
- **travel-booking:** Travel Booking example と E2E テストを追加 ([b929b58](https://github.com/tai-kun/pera1/commit/b929b58a97f07276efe8e04e27ebaaabc75b10e3))
- **saas-project:** SaaS Project Management example と E2E テストを追加 ([227289d](https://github.com/tai-kun/pera1/commit/227289d91b2b3003776186cfb707208214897e6f))
- **sns-community:** SNS / Community example と E2E テストを追加 ([8217e4e](https://github.com/tai-kun/pera1/commit/8217e4e111089691e20952ef6848cd96571d332f))
- **e-commerce:** E-commerce example と E2E テストを追加 ([25986b0](https://github.com/tai-kun/pera1/commit/25986b0926b3488c5b97d582629ecd794e166716))
- **admin-dashboard:** Admin Dashboard example と E2E テストを追加 ([89d1c17](https://github.com/tai-kun/pera1/commit/89d1c17138f2e4326e18aad6131d9c0c71f74ff6))
- **blog:** Blog / Documentation example と E2E テストを追加 ([65de07b](https://github.com/tai-kun/pera1/commit/65de07bdcc0c7396ea0562a3b755a0d664df95c9))
- **contacts:** api/ にバックエンドの処理を移す ([38fa2d7](https://github.com/tai-kun/pera1/commit/38fa2d7fbb27d7d75a5947297a9d746e09337f79))
- **contacts:** E2E テストを追加 ([caf266f](https://github.com/tai-kun/pera1/commit/caf266f3cec40b9e66a6c1d1c1cf1836f9f6df7a))
- **contacts:** デバッグ情報について編集 ([79c96bc](https://github.com/tai-kun/pera1/commit/79c96bcf5ff4321741e3b4cf0e7214ef465bf527))
- **contacts:** README.md を追加 ([e39dcfd](https://github.com/tai-kun/pera1/commit/e39dcfd9ca09c9fdf20c02dd7b360127b2420d16))
- **contacts:** pages の構成を整理 ([747bdb3](https://github.com/tai-kun/pera1/commit/747bdb3f788a87293374a9483cd9e8bfe9a45627))
- 日本語を整える ([f0ec51a](https://github.com/tai-kun/pera1/commit/f0ec51a4ee754478b8f9ac0ae91c6a4ac1f537b1))
- format ([af217fa](https://github.com/tai-kun/pera1/commit/af217fa1a61ac768e8723da939fee40f3d777f91))
- テストを拡充し @pera1/react をクライアント専用に整理 ([362c6fa](https://github.com/tai-kun/pera1/commit/362c6fa7ed3e7be43af9fc822c180d72e9d5f0f3))
- soseki.js を移植 ([51a710f](https://github.com/tai-kun/pera1/commit/51a710fdb07b6d21363016af39b38c75e77a4a75))

**Full Changelog**: https://github.com/tai-kun/pera1/compare/@pera1/core@0.0.2...@pera1/core@0.0.5

## v0.0.2

### その他

- format ([3b7a78a](https://github.com/tai-kun/pera1/commit/3b7a78a7693b1d7b2e39679d3437ef5780ac19d2))
- WIP ([2627417](https://github.com/tai-kun/pera1/commit/2627417d0eeb34587c19dcb803071f0091eb7a72))

**Full Changelog**: https://github.com/tai-kun/pera1/commits/@pera1/core@0.0.2

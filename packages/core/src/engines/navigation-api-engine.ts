import log from "../_logger.js";
import unreachable from "../core/_unreachable.js";
import * as v from "../core/_valibot.js";
import { NavigationApiNotSupportedError } from "../core/errors.js";
import expectHistoryEntry from "../core/expect-history-entry.js";
import createHtmlFormElementFormFormData from "../core/form-data-to-html-form-element.js";
import type { HistoryEntryId } from "../core/history-entry-id-schema.js";
import HistoryEntryIdSchema from "../core/history-entry-id-schema.js";
import HistoryEntryUrlSchema from "../core/history-entry-url-schema.js";
import initLoaders from "../core/init-loaders.js";
import matchRoutes from "../core/match-routes.js";
import RoutePath from "../core/route-path.js";
import startAction from "../core/start-action.js";
import startLoaders from "../core/start-loaders.js";
import type { IEngine } from "./engine.types.js";

/**
 * モダンブラウザーに搭載されている標準の `Navigation API` を活用し、クライアントサイドにおける高度な SPA ルーティングを制御するエンジンクラスです。
 */
export default class NavigationApiEngine implements IEngine {
  /**
   * ブラウザー標準の `navigation` オブジェクトへの参照を保持します。
   */
  private navigation: Navigation;

  /**
   * メモリーリークを防ぐため、すでに dispose リスナーを登録済みの履歴エントリー ID を追跡するセットです。
   */
  private subscribedEntryIds: Set<HistoryEntryId>;

  /**
   * 連続して発生した画面遷移を適切にキャンセルするための、最新ナビゲーション用の中断コントローラーです。
   */
  private navAbortController: AbortController | null;

  /**
   * `NavigationApiEngine` クラスのインスタンスを初期化します。
   *
   * 実行環境が `Navigation API` をサポートしていない場合はエラーを投げます。
   */
  public constructor() {
    let navigation_: Navigation | undefined;

    // グローバル環境または window オブジェクトから navigation インスタンスの回収を試みます。
    for (const getNav of [() => navigation, () => window.navigation]) {
      try {
        navigation_ = getNav();
        if (typeof navigation_ !== "undefined") {
          break;
        }
      } catch {}
    }

    // オブジェクトとして存在しない場合はサポート外の環境とみなします。
    if (typeof navigation_ !== "object") {
      throw new NavigationApiNotSupportedError();
    }

    this.navigation = navigation_;
    this.subscribedEntryIds = new Set();
    this.navAbortController = null;
  }

  /**
   * 現在のページ URL に基づき、ルーターの初期状態を構築し、登録します。
   *
   * @param args ルート定義配列、共通データストア、初期化用のアボートシグナルを含むオブジェクトです。
   * @returns 構築された初期の `RouterState` です。適合するルートがないか、履歴がない場合は `null` を返します。
   */
  init(args: IEngine.InitArgs): IEngine.InitReturn {
    const currentEntry = expectHistoryEntry(this.navigation.currentEntry);
    if (!currentEntry) {
      log.debug("初期エントリーが未確定のため null を返します");
      return null;
    }

    const { routes, getSignal, loaderDataStore } = args;
    const currentRoutes = matchRoutes(routes, currentEntry.url);
    if (!currentRoutes) {
      log.debug("初期URLに一致するルートがありません（url: {url}）", {
        url: currentEntry.url.href,
      });
      return null;
    }

    // 初期表示に必要なすべてのローダーを一斉に並行起動します。
    const dataMap = initLoaders(currentRoutes, {
      url: currentEntry.url,
      signal: getSignal(),
    });

    // 起動したローダーの結果（NinjaPromise）のマップを、現在の履歴 ID をキーとしてキャッシュします。
    loaderDataStore.set(currentEntry.id, dataMap);

    log.debug("初期化が完了しました（url: {url}, 一致数: {matchedCount}）", {
      url: currentEntry.url.href,
      matchedCount: currentRoutes.length,
    });

    return {
      entry: currentEntry,
      routes: currentRoutes,
    };
  }

  /**
   * ブラウザーの継続的なナビゲーションイベント（リンククリック、フォーム送信、履歴移動）の監視を開始します。
   *
   * @param args ルート配列、UI 側への状態反映関数、各種ストア、シグナル取得関数を含むオブジェクトです。
   */
  start(args: IEngine.StartArgs): IEngine.StartReturn {
    const { routes, update, getSignal, actionDataStore, loaderDataStore } = args;

    /**
     * ユーザーのアクションによって発生したすべての遷移要求をインターセプトして処理する、ルーティングの中枢ハンドラーです。
     */
    const handleNavigate = (event: NavigateEvent): void => {
      // 処理すべきでない通常のブラウザー固有のナビゲーション（ハッシュ変更、ファイルのダウンロードなど）は、標準の挙動を妨げないようにインターセプトせず即座にスルーします。
      // 参照: https://developer.mozilla.org/docs/Web/API/Navigation_API#handling_a_navigation_using_intercept
      if (
        !event.isTrusted ||
        !event.canIntercept ||
        event.hashChange ||
        event.downloadRequest !== null ||
        event.navigationType === "reload"
      ) {
        log.debug("ナビゲーションをスルーします（type: {type}）", {
          type: event.navigationType,
        });
        return;
      }

      const currentEntry = expectHistoryEntry(this.navigation.currentEntry);
      if (!currentEntry) {
        log.debug("現在のエントリーが未確定のため未マッチにリセットします");
        // 現在のエントリーが存在しない場合は、ルーターを未マッチ状態（null）にリセットして制御をブラウザーに返します。
        event.intercept({
          async handler() {
            update(null);
          },
        });

        return;
      }

      // 移動先の URL を検証し、適合するルート定義があるかを探索します。
      const destUrl = v.expect(HistoryEntryUrlSchema(), event.destination.url);
      const destRoutes = matchRoutes(routes, destUrl);
      if (!destRoutes) {
        log.debug("移動先に一致するルートがありません（to: {to}）", {
          to: destUrl.href,
        });
        // 移動先のルート定義が見つからない場合は、ルーターを未マッチ状態（null）にリセットして制御をブラウザーに返します。
        event.intercept({
          async handler() {
            update(null);
          },
        });

        return;
      }

      // 前回の遷移から短時間で遷移する場合を考慮し、進行中だった以前の古い非同期処理をすべて安全に中断します。
      if (this.navAbortController) {
        log.debug("進行中の遷移を中断します");
      }
      this.navAbortController?.abort();
      this.navAbortController = new AbortController();
      const { signal } = this.navAbortController;
      const { formData } = event;
      const prevEntryInHandler = currentEntry;

      log.debug("ナビゲーションを受信しました（trigger: {trigger}, from: {from} -> to: {to}）", {
        trigger: formData ? "POST" : "GET",
        from: currentEntry.url.href,
        to: destUrl.href,
      });

      // 分岐 A: フォームデータが伴う場合 ＝ データ変更要求（HTTP POST / Action 契機）
      if (formData) {
        const { sourceElement } = event;

        // submit メソッドによってプログラムから動的生成されたフォーム要素であれば、用済みのため DOM から削除します。
        if (sourceElement?.hasAttribute("data-pera1submit")) {
          document.body.removeChild(sourceElement);
        }

        /**
         * A-1: URL が書き換わる直前の段階で割り込んでアクション関数を実行するハンドラーです。
         */
        const precommitHandler = async (controller: NavigationPrecommitController) => {
          const action = startAction(destRoutes, {
            url: destUrl,
            signal,
            formData,
          });
          if (!action) {
            log.debug("アクションが定義されていないためコミットへ進みます（to: {to}）", {
              to: destUrl.href,
            });
            return;
          }

          // アクションの実行状態を現在の履歴 ID に紐づけてストアへ保存します。
          actionDataStore
            .getOrInsertComputed(currentEntry.id, () => new Map())
            .set(action.func, action.data);

          // アクションの開始に伴い、UI 層へローディング状態などの再描画を伝播します。
          update();

          // 全アクションの処理が完了するまで待機します。
          const actionResponse = await action.idle();
          const redirectUrl = new URL(currentEntry.url.href);

          switch (action.data.status) {
            case "rejected": {
              // アクションがエラーで失敗した場合は、URL を変更せず現在の元のページに強制リダイレクトさせます。
              log.debug("アクションが失敗したため現在のURLに留まります（url: {url}）", {
                url: currentEntry.url.href,
              });
              controller.redirect(RoutePath.encode(currentEntry.url));

              break;
            }

            case "fulfilled": {
              // アクションが正常終了した場合、返り値にリダイレクト指示が含まれていればその目的地へ遷移させます。
              // リダイレクトがなければそのまま本来の目的地へブラウザーのコミット先を書き換えます。
              const { redirectTo = currentEntry.url } = actionResponse;
              const redirectPath = new RoutePath(redirectTo);
              controller.redirect(redirectPath.toString());

              redirectUrl.pathname = redirectPath.pathname;
              redirectUrl.search = redirectPath.search;
              redirectUrl.hash = redirectPath.hash;

              log.debug("アクション完了後の遷移先を確定しました（to: {to}）", {
                to: redirectUrl.href,
              });

              break;
            }

            default:
              unreachable(action.data.status as never);
          }

          // 次の描画確定フェーズへコンテキスト情報を引き継ぎます。
          return {
            action: action.func,
            actionData: action.data,
            redirectUrl,
          };
        };

        /**
         * A-2: アクションが完了し、ブラウザーの URL コミットが確定した後に画面表示を同期させるハンドラーです。
         */
        const handler = async (args: Awaited<ReturnType<typeof precommitHandler>>) => {
          if (!args) {
            return;
          }

          const { action, actionData, redirectUrl } = args;

          // 履歴エントリーを再度取得します。
          const currentEntry = expectHistoryEntry(this.navigation.currentEntry);
          if (!currentEntry) {
            log.debug("コミット後のエントリーが未確定のため未マッチにリセットします");
            // 現在のエントリーが存在しない場合は、ルーターを未マッチ状態（null）にリセットして制御をブラウザーに返します。
            update(null);
            return;
          }

          // コミットされた実際のブラウザー URL が、想定しているリダイレクト先と一致しない場合は処理を中断します。
          if (currentEntry.url.href !== redirectUrl.href) {
            log.debug(
              "コミットURLの不一致により処理を中断します（actual: {actual}, expected: {expected}）",
              {
                actual: currentEntry.url.href,
                expected: redirectUrl.href,
              },
            );
            return;
          }

          // 確定した新しい履歴 ID に改めてアクション結果をキャッシュします。
          actionDataStore
            .getOrInsertComputed(currentEntry.id, () => new Map())
            .set(action, actionData);

          const currentRoutes = matchRoutes(routes, currentEntry.url);
          if (!currentRoutes) {
            log.debug("コミット後のURLに一致するルートがありません（url: {url}）", {
              url: currentEntry.url.href,
            });
            // 現在のルート定義が見つからない場合は、ルーターを未マッチ状態（null）にリセットして制御をブラウザーに返します。
            update(null);
            return;
          }

          // アクションの処理結果を反映させるために、該当するルートのローダーを実行します。
          const prevEntry = prevEntryInHandler;
          const prevRoutes = matchRoutes(routes, prevEntry.url);
          const startedLoaders = startLoaders(
            {
              signal,
              prevEntry,
              prevRoutes,
              currentEntry,
              currentRoutes,
              loaderDataStore,
            },
            {
              formData,
              actionData,
            },
          );

          // 最新の確定状態を UI に通知して画面を再描画します。ローダーの結果の中には実行中のものもありますが、それらの待機や描画は各コンポーネントに任せます。
          log.debug("アクション後の画面を確定しました（url: {url}, 一致数: {matchedCount}）", {
            url: currentEntry.url.href,
            matchedCount: currentRoutes.length,
          });
          update({
            entry: currentEntry,
            routes: currentRoutes,
          });

          // 全ローダーの完了を待機します。ここで待機することで、全ローダーの実行が完了するまでブラウザーのタブにはローディングスピーナーが表示されます。
          await startedLoaders?.idle();
        };

        // Navigation API のインターセプト機構に、二段階の処理をバインドします。
        let precommitResult: Awaited<ReturnType<typeof precommitHandler>>;
        event.intercept({
          async precommitHandler(controller) {
            precommitResult = await precommitHandler(controller);
          },
          async handler() {
            await handler(precommitResult);
          },
        });
      } else {
        // 分岐 B: フォームデータがない場合 ＝ 通常の画面遷移（HTTP GET / リンククリック、戻る進む契機）
        const handler = async () => {
          const currentEntry = expectHistoryEntry(this.navigation.currentEntry);
          if (!currentEntry) {
            log.debug("遷移先のエントリーが未確定のため未マッチにリセットします");
            update(null);
            return;
          }
          // 同期がズレている場合はガードします。
          if (currentEntry.url.href !== destUrl.href) {
            log.debug(
              "遷移先URLの不一致により処理を中断します（actual: {actual}, expected: {expected}）",
              {
                actual: currentEntry.url.href,
                expected: destUrl.href,
              },
            );
            return;
          }

          const prevEntry = prevEntryInHandler;
          const prevRoutes = matchRoutes(routes, prevEntry.url);
          const currentRoutes = destRoutes;

          // キャッシュの再利用判定を含めて、移動先のローダー関数群を精査し、起動します。
          const startedLoaders = startLoaders({
            signal,
            prevEntry,
            prevRoutes,
            currentEntry,
            currentRoutes,
            loaderDataStore,
          });

          // 最新の確定状態を UI に通知して画面を再描画します。ローダーの結果の中には実行中のものもありますが、それらの待機や描画は各コンポーネントに任せます。
          log.debug("画面遷移を確定しました（from: {from} -> to: {to}, 一致数: {matchedCount}）", {
            from: prevEntry.url.href,
            to: currentEntry.url.href,
            matchedCount: currentRoutes.length,
          });
          update({
            entry: currentEntry,
            routes: currentRoutes,
          });

          // 全ローダーの完了を待機します。ここで待機することで、全ローダーの実行が完了するまでブラウザーのタブにはローディングスピーナーが表示されます。
          await startedLoaders?.idle();
        };

        event.intercept({
          async handler() {
            await handler();
          },
        });
      }
    };

    const signal = getSignal();

    // 外部からルーター全体の監視終了シグナルを受け取った際、中断処理を連動させます。
    const handleAbort = (): void => {
      log.debug("ルーターの停止に連動して進行中の遷移を中断します");
      this.navAbortController?.abort();
      this.navAbortController = null;
    };
    signal.addEventListener("abort", handleAbort, { once: true });

    // Navigation API の navigate イベントの購読を開始します。
    log.debug("ナビゲーションイベントの監視を開始します");
    this.navigation.addEventListener("navigate", handleNavigate, { signal });

    // セッション履歴から溢れて破棄された古い履歴エントリーのデータ（アクション、ローダーのキャッシュ）を自動削除します。
    for (const entry of this.navigation.entries()) {
      const entryId = v.expect(HistoryEntryIdSchema(), entry.id);
      if (this.subscribedEntryIds.has(entryId)) {
        continue;
      }

      const handleDispose = (): void => {
        log.debug("破棄された履歴のキャッシュを削除しました（id: {id}）", {
          id: entryId,
        });
        this.subscribedEntryIds.delete(entryId);
        actionDataStore.delete(entryId);
        loaderDataStore.delete(entryId);
      };
      entry.addEventListener("dispose", handleDispose, { signal });
      this.subscribedEntryIds.add(entryId);
    }

    // ナビゲーションの進行に伴い、新しく生成される履歴エントリーに対しても、動的に破棄イベントの監視網を広げます。
    const handleCurrentEntryChange = (): void => {
      const currentEntry = expectHistoryEntry(this.navigation.currentEntry);
      if (!currentEntry) {
        return;
      }
      if (this.subscribedEntryIds.has(currentEntry.id)) {
        return;
      }

      const handleDispose = (): void => {
        log.debug("破棄された履歴のキャッシュを削除しました（id: {id}）", {
          id: currentEntry.id,
        });
        this.subscribedEntryIds.delete(currentEntry.id);
        actionDataStore.delete(currentEntry.id);
        loaderDataStore.delete(currentEntry.id);
      };
      this.navigation.currentEntry!.addEventListener("dispose", handleDispose, { signal });
      this.subscribedEntryIds.add(currentEntry.id);
    };
    this.navigation.addEventListener("currententrychange", handleCurrentEntryChange, { signal });
  }

  /**
   * フォームデータまたはクエリーパラメーターを、ブラウザーの Navigation API のライフサイクルに載せて命令的に送信します。
   *
   * @param args 送信データの種類に応じたサブミット引数です。
   */
  submit(args: IEngine.SubmitArgs): void {
    switch (args.type) {
      case "FORM_DATA": {
        const { action, target } = args;
        log.debug("フォームを送信します（action: {action}）", () => ({
          action,
          fieldCount: [...target.keys()].length,
        }));
        const form = createHtmlFormElementFormFormData(target);
        form.method = "POST";
        form.action = action;
        form.enctype = "multipart/form-data";
        form.dataset["pera1submit"] = ""; // 後で削除できるように目印を付与します。

        // 実際のフォーム送信を行うために DOM へ一時配置して実行します。
        // ハンドラーがこの要素を使用した後に DOM から削除します。
        document.body.appendChild(form);
        form.submit();

        break;
      }

      case "URL_SEARCH_PARAMS": {
        const { action, target, history } = args;
        const path = new RoutePath(action);
        path.search = target.toString();

        log.debug("クエリーを送信します（to: {to}, history: {history}）", {
          to: path.toString(),
          history,
        });
        // Navigation API を用いて、クエリーが上書きされた新しいアドレスへ遷移させます。
        this.navigation.navigate(path.toString(), { history });

        break;
      }

      default:
        unreachable(args);
    }
  }

  /**
   * 命令的なページ遷移を処理します。
   *
   * @param args 遷移タイプに応じたナビゲーション引数です。
   */
  navigate(args: IEngine.NavigateArgs): void {
    switch (args.type) {
      case "LINK": {
        const { to, history } = args;
        switch (to.type) {
          case "STATIC": {
            // 完全なパス文字列の余分なスラッシュなどをエンコードして直接遷移します。

            const path = RoutePath.encode(to.path);
            log.debug("リンク遷移します（to: {to}, history: {history}）", {
              to: path,
              history,
            });
            this.navigation.navigate(path, { history });

            break;
          }

          case "DYNAMIC": {
            // 現在のロケーション情報をベースに、指定されたパーツ（パス名、クエリー、ハッシュのみなど）を部分的に上書きしたマージ URL を算出します。

            const currentPath = new RoutePath(window.location);
            const currentPathString = currentPath.toString();
            const nextPath = currentPath;
            to.patch(nextPath);
            const nextPathString = nextPath.toString();

            // 無駄な遷移履歴を作らないように、URL に実際の変化がある場合のみ navigate を実行します。
            if (nextPathString !== currentPathString) {
              log.debug("リンク遷移します（from: {from} -> to: {to}, history: {history}）", {
                from: currentPathString,
                to: nextPathString,
                history,
              });
              this.navigation.navigate(nextPathString, { history });
            } else {
              log.debug("URLに変化がないため遷移をスキップします（url: {url}）", {
                url: currentPathString,
              });
            }

            break;
          }

          default:
            unreachable(to);
        }

        break;
      }

      case "MOVE": {
        const currentEntry = expectHistoryEntry(this.navigation.currentEntry);
        if (!currentEntry) {
          log.debug("現在のエントリーが未確定のため履歴移動をスキップします");
          return;
        }

        const { delta } = args;

        // 現在のインデックスから相対位置（例: `-1` なら 1 つ戻る）を計算し、履歴スタックに該当するインデックスが存在するか探索します。
        const index = currentEntry.index + delta;
        const entry = this.navigation.entries().find((e) => e.index === index);
        if (!entry) {
          log.debug(
            "移動先の履歴が存在しないためスキップします（index: {index}, delta: {delta}）",
            {
              index: currentEntry.index,
              delta,
            },
          );
          // スタックの限界を超える移動要求の場合は何もしません。
          return;
        }

        log.debug("履歴を移動します（index: {from} -> {to}）", {
          from: currentEntry.index,
          to: index,
        });
        // Navigation API の traverseTo メソッドを使用し、一意の識別キーを指定して目的地へジャンプします。
        this.navigation.traverseTo(entry.key);

        break;
      }

      default:
        unreachable(args);
    }
  }
}

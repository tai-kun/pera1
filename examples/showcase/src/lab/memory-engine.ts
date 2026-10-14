import type {
  ActionFunction,
  HistoryEntry,
  HistoryEntryId,
  IEngine,
  LoaderFunction,
  NavigateOptions,
  NavigateTo,
  ReadonlyFormData,
  RedirectResponse,
  Route,
  RouterState,
  SubmitGetOptions,
  SubmitPostOptions,
} from "@pera1/core";
import {
  expectHistoryEntry,
  initLoaders,
  matchRoutes,
  RoutePath,
  startAction,
  startLoaders,
  toNavigateArgs,
  toSubmitArgs,
  UnreachableError,
} from "@pera1/core";
import type { NinjaPromise } from "ninja-promise";
import type * as React from "react";

type Component = React.ComponentType<{}>;

/**
 * デモ UI で履歴一覧を表示するための読み取り専用ビューです。
 */
export type MemoryEntryView = {
  readonly id: string;
  readonly href: string;
  readonly index: number;
  readonly current: boolean;
};

/**
 * Navigation API に依存しない、メモリー上だけで完結する自作エンジンです。
 *
 * `@pera1/core` の `expectHistoryEntry`、`matchRoutes`、`initLoaders`、`startLoaders`、
 * `startAction`、`toNavigateArgs`、`toSubmitArgs` を組み合わせて `IEngine` の契約を実装しています。
 *
 * ブラウザーの履歴は操作せず、`entries` 配列と `currentIndex` でセッション履歴を再現します。
 */
export class MemoryEngine implements IEngine<Component> {
  private readonly origin: string;

  private entries: HistoryEntry[];

  private currentIndex = 0;

  private routes: readonly Route<Component>[] = [];

  private loaderDataStore: Map<HistoryEntryId, Map<LoaderFunction, NinjaPromise<unknown>>> =
    new Map();

  private actionDataStore: Map<HistoryEntryId, Map<ActionFunction, NinjaPromise<unknown>>> =
    new Map();

  private updateFn: IEngine.StartArgs<Component>["update"] | null = null;

  private getAbortSignal: () => AbortSignal = () => new AbortController().signal;

  private abortController = new AbortController();

  private pendingRedirect: { redirect: RedirectResponse; entry: HistoryEntry } | null = null;

  public constructor(initialPath = "/") {
    this.origin = window.location.origin;
    this.entries = [this.createEntry(initialPath, 0)];
    this.currentIndex = 0;
  }

  /**
   * 現在の履歴エントリーです。
   */
  public get currentEntry(): HistoryEntry {
    return this.entries[this.currentIndex]!;
  }

  /**
   * メモリー上の履歴エントリー一覧を返します。
   */
  public getEntries(): readonly MemoryEntryView[] {
    return this.entries.map((entry, index) => ({
      id: entry.id,
      href: entry.url.href,
      index,
      current: index === this.currentIndex,
    }));
  }

  /**
   * デモ UI からプログラム遷移するためのヘルパーです。
   *
   * 入力は `useNavigate` と同じ形を受け付け、`toNavigateArgs` でエンジン引数へ正規化します。
   */
  public go(to: NavigateTo | number, options?: NavigateOptions): void {
    this.navigate(toNavigateArgs(to, options));
  }

  /**
   * デモ UI からプログラム送信するためのヘルパーです。
   *
   * 入力は `useSubmit` と同じ形を受け付け、`toSubmitArgs` でエンジン引数へ正規化します。
   */
  public send(
    target: ReadonlyFormData | URLSearchParams,
    options: SubmitGetOptions | SubmitPostOptions = {},
  ): void {
    const formAction = new RoutePath(this.currentEntry.url).pathname;
    this.submit(toSubmitArgs(target, formAction, options));
  }

  /**
   * `IEngine.init` の実装です。現在のエントリーを同期的にマッチし、ローダーを起動します。
   */
  public init({
    routes,
    loaderDataStore,
    getSignal,
  }: IEngine.InitArgs<Component>): IEngine.InitReturn<Component> {
    this.routes = routes;
    this.loaderDataStore = loaderDataStore;
    this.getAbortSignal = getSignal;

    return this.loadEntry(this.currentEntry);
  }

  /**
   * `IEngine.start` の実装です。メモリーエンジンは外部イベントを購読しないため、
   * 初期表示時のリダイレクト処理だけを行います。
   */
  public start({
    actionDataStore,
    loaderDataStore,
    update,
    getSignal,
  }: IEngine.StartArgs<Component>) {
    this.actionDataStore = actionDataStore;
    this.loaderDataStore = loaderDataStore;
    this.updateFn = update;
    this.getAbortSignal = getSignal;

    if (this.pendingRedirect) {
      const { redirect, entry } = this.pendingRedirect;
      this.pendingRedirect = null;
      this.resolveRedirect(redirect, entry, 0);
    }

    return () => {
      this.updateFn = null;
      // 停止後は進行中のローダー / アクションを中断し、破棄されたことを伝えます。
      this.abortController.abort();
    };
  }

  /**
   * `IEngine.submit` の実装です。`FormData` はアクション、`URLSearchParams` はローダーの再取得へ振り分けます。
   */
  public submit(args: IEngine.SubmitArgs): void {
    if (args.type === "FORM_DATA") {
      void this.runPost(args.action, args.target);

      return;
    }

    const path = new RoutePath(args.action);
    // `NavigationApiEngine` と同じく、`?` の有無は `RoutePath` のセッターに任せます。
    path.search = args.target.toString();
    this.navigateTo(path.toString(), args.history);
  }

  /**
   * `IEngine.navigate` の実装です。リンク遷移と履歴移動を処理します。
   */
  public navigate(args: IEngine.NavigateArgs): void {
    switch (args.type) {
      case "MOVE": {
        this.move(args.delta);

        return;
      }
      case "LINK": {
        if (args.to.type === "STATIC") {
          this.navigateTo(args.to.path, args.history);

          return;
        }

        const path = new RoutePath(this.currentEntry.url);
        args.to.patch(path);
        this.navigateTo(path.toString(), args.history);

        return;
      }
      default: {
        throw new UnreachableError({ actual: [args] });
      }
    }
  }

  /**
   * 新しい履歴エントリーを追加 (または置換) して GET 遷移します。
   */
  private navigateTo(target: string, history: "push" | "replace"): void {
    const prevEntry = this.currentEntry;
    const prevRoutes = matchRoutes(this.routes, prevEntry.url);

    if (history === "replace") {
      this.disposeEntries([this.entries[this.currentIndex]!]);
      this.entries[this.currentIndex] = this.createEntry(target, this.currentIndex);
    } else {
      // 進む方向に残っていたエントリーは破棄されるため、キャッシュも合わせて削除します。
      this.disposeEntries(this.entries.splice(this.currentIndex + 1));
      this.entries.push(this.createEntry(target, this.entries.length));
      this.currentIndex = this.entries.length - 1;
    }

    const entry = this.currentEntry;
    const matched = matchRoutes(this.routes, entry.url);
    if (!matched) {
      this.updateFn?.(null);

      return;
    }

    const started = startLoaders({
      prevEntry,
      prevRoutes,
      currentEntry: entry,
      currentRoutes: matched,
      loaderDataStore: this.loaderDataStore,
      signal: this.swapSignal(),
    });
    this.updateFn?.({ entry, routes: matched });
    void started.idle().then(({ redirectTo }) => {
      if (redirectTo) {
        this.resolveRedirect(redirectTo, entry, 0);
      }
    });
  }

  /**
   * 履歴スタック内を相対移動し、GET 遷移と同じキャッシュ判定でローダーを評価します。
   */
  private move(delta: number): void {
    const next = this.currentIndex + delta;
    if (next < 0 || next >= this.entries.length) {
      return;
    }

    const prevEntry = this.currentEntry;
    const prevRoutes = matchRoutes(this.routes, prevEntry.url);
    this.currentIndex = next;
    const entry = this.currentEntry;
    const matched = matchRoutes(this.routes, entry.url);
    if (!matched) {
      this.updateFn?.(null);

      return;
    }

    const started = startLoaders({
      prevEntry,
      prevRoutes,
      currentEntry: entry,
      currentRoutes: matched,
      loaderDataStore: this.loaderDataStore,
      signal: this.swapSignal(),
    });
    this.updateFn?.({ entry, routes: matched });
    void started.idle().then(({ redirectTo }) => {
      if (redirectTo) {
        this.resolveRedirect(redirectTo, entry, 0);
      }
    });
  }

  /**
   * POST 遷移です。アクションを実行してから、送信後の既定判定でローダーを再実行します。
   */
  private async runPost(actionPath: string, formData: ReadonlyFormData): Promise<void> {
    const matched = matchRoutes(this.routes, new URL(actionPath, this.origin));
    if (!matched) {
      this.updateFn?.(null);

      return;
    }

    const action = startAction(matched, {
      url: expectHistoryEntry({
        id: crypto.randomUUID(),
        url: new URL(actionPath, this.origin).href,
        index: 0,
      })!.url,
      formData,
      signal: this.swapSignal(),
    });
    if (!action) {
      return;
    }

    const prevEntry = this.currentEntry;
    const prevRoutes = matchRoutes(this.routes, prevEntry.url);

    // フォーム送信は新しい履歴エントリーを積みます。
    this.disposeEntries(this.entries.splice(this.currentIndex + 1));
    this.entries.push(this.createEntry(actionPath, this.entries.length));
    this.currentIndex = this.entries.length - 1;
    let entry = this.currentEntry;

    // アクションの結果は送信先のエントリーに紐づけて画面から参照できるようにします。
    this.actionDataStore.set(entry.id, new Map([[action.func, action.data]]));
    this.updateFn?.();

    const { redirectTo } = await action.idle();
    let actionData: unknown;
    try {
      actionData = await action.data;
    } catch {
      actionData = undefined;
    }

    if (redirectTo) {
      this.disposeEntries([this.entries[this.currentIndex]!]);
      this.entries[this.currentIndex] = this.createEntry(
        `${redirectTo.pathname}${redirectTo.search}${redirectTo.hash}`,
        this.currentIndex,
      );
      entry = this.currentEntry;
    }

    const currentRoutes = matchRoutes(this.routes, entry.url);
    if (!currentRoutes) {
      this.updateFn?.(null);

      return;
    }

    // 送信後は既定の判定が常に再取得になるため、フォームデータと結果を渡します。
    const started = startLoaders(
      {
        prevEntry,
        prevRoutes,
        currentEntry: entry,
        currentRoutes,
        loaderDataStore: this.loaderDataStore,
        signal: this.swapSignal(),
      },
      { formData: formData as unknown as FormData, actionData },
    );
    this.updateFn?.({ entry, routes: currentRoutes });
    void started.idle().then(({ redirectTo: nextRedirect }) => {
      if (nextRedirect) {
        this.resolveRedirect(nextRedirect, entry, 0);
      }
    });
  }

  /**
   * 現在のエントリーを対象にローダーを起動します。初回表示用です。
   */
  private loadEntry(entry: HistoryEntry): RouterState<Component> | null {
    const matched = matchRoutes(this.routes, entry.url);
    if (!matched) {
      return null;
    }

    const initialized = initLoaders(matched, {
      url: entry.url,
      signal: this.getAbortSignal(),
    });
    this.loaderDataStore.set(entry.id, initialized.dataMap);
    void initialized.idle().then(({ redirectTo }) => {
      if (!redirectTo) {
        return;
      }

      if (this.updateFn) {
        this.resolveRedirect(redirectTo, entry, 0);
      } else {
        // `start` が呼ばれる前にリダイレクトが確定した場合は、`update` が手に入るまで保留します。
        this.pendingRedirect = { redirect: redirectTo, entry };
      }
    });

    return { entry, routes: matched };
  }

  /**
   * ローダーまたはアクションが返した `RedirectResponse` を処理します。
   *
   * リダイレクトが連鎖した場合の無限ループを避けるため、深さの上限を設けています。
   */
  private resolveRedirect(
    redirect: RedirectResponse,
    prevEntry: HistoryEntry,
    depth: number,
  ): void {
    if (depth > 3) {
      return;
    }

    const prevRoutes = matchRoutes(this.routes, prevEntry.url);
    this.disposeEntries([this.entries[this.currentIndex]!]);
    this.entries[this.currentIndex] = this.createEntry(
      `${redirect.pathname}${redirect.search}${redirect.hash}`,
      this.currentIndex,
    );
    const entry = this.currentEntry;
    const matched = matchRoutes(this.routes, entry.url);
    if (!matched) {
      this.updateFn?.(null);

      return;
    }

    const started = startLoaders({
      prevEntry,
      prevRoutes,
      currentEntry: entry,
      currentRoutes: matched,
      loaderDataStore: this.loaderDataStore,
      signal: this.swapSignal(),
    });
    this.updateFn?.({ entry, routes: matched });
    void started.idle().then(({ redirectTo }) => {
      if (redirectTo) {
        this.resolveRedirect(redirectTo, entry, depth + 1);
      }
    });
  }

  /**
   * 新しい遷移を開始する前に、前回の遷移で配ったシグナルを abort して
   * 新しい `AbortSignal` を配ります。
   *
   * `init` だけは `createRouter` が用意した `getSignal()` をそのまま使います。
   */
  private swapSignal(): AbortSignal {
    this.abortController.abort();
    this.abortController = new AbortController();

    return this.abortController.signal;
  }

  /**
   * 破棄された履歴エントリーに紐づくローダー / アクションのデータをストアから削除します。
   *
   * ドキュメントの「エントリー破棄でデータも削除」に合わせ、不要になった
   * エントリーのキャッシュが残り続けないようにします。
   */
  private disposeEntries(entries: readonly HistoryEntry[]): void {
    for (const entry of entries) {
      this.loaderDataStore.delete(entry.id);
      this.actionDataStore.delete(entry.id);
    }
  }

  /**
   * 履歴エントリーを生成し、`expectHistoryEntry` で検証します。
   */
  private createEntry(path: string, index: number): HistoryEntry {
    const entry = expectHistoryEntry({
      id: crypto.randomUUID(),
      url: new URL(RoutePath.encode(path), this.origin).href,
      index,
    });
    if (!entry) {
      throw new UnreachableError({ actual: [] });
    }

    return entry;
  }
}

/**
 * Lab ページで共有するメモリーエンジンのシングルトンです。
 *
 * メモリーエンジンはメインアプリとは独立したミニアプリとして振る舞うため、
 * 履歴の初期 URL は自身のルート定義に合わせて `/` から始めます。
 * ページを離れて戻ってきてもセッション履歴が残るため、キャッシュの挙動を観察できます。
 */
export const memoryEngine = new MemoryEngine("/");

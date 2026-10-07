import fs from "node:fs";
import path from "node:path";

import normalizePath from "./_path.js";

/**
 * ファイルベースルーティングが生成する、1 つのページモジュールに対応するルートノードです。
 */
export type RouteNode = {
  /**
   * マッチングの対象となるパスパターンです。
   */
  readonly path: string;

  /**
   * 親パスに完全一致したときだけ使うインデックスルートかどうかです。
   */
  readonly index: boolean;

  /**
   * ページモジュールの絶対パスです。
   */
  readonly modulePath: string;

  /**
   * このルートの配下にネストされる子ルートです。
   */
  readonly children: readonly RouteNode[];
};

/**
 * ルートの探索に必要な設定です。
 */
export type ScanRoutesArgs = {
  /**
   * 探索の起点となるプロジェクトルートの絶対パスです。
   */
  readonly root: string;

  /**
   * ページを格納したディレクトリーの、ルートからの相対パスです。
   */
  readonly dir: string;

  /**
   * ルートとして扱うファイルの glob パターンです。
   * ページディレクトリーからの相対パスで指定します。
   */
  readonly include: readonly string[];

  /**
   * ルートから除外するファイルの glob パターンです。
   * ページディレクトリーからの相対パスで指定します。
   */
  readonly exclude: readonly string[];
};

/**
 * ルートとして採用された 1 件のファイルです。
 */
type RouteFile = {
  /**
   * 拡張子を除いたファイル名です。
   */
  readonly basename: string;

  /**
   * ファイルの絶対パスです。
   */
  readonly filePath: string;
};

/**
 * ディレクトリー 1 階層分のルート要素を表すツリーです。
 */
type DirectoryTree = {
  /**
   * このディレクトリー直下のルートファイルです。
   */
  readonly files: readonly RouteFile[];

  /**
   * サブディレクトリー名からツリーへのマップです。
   */
  readonly directories: ReadonlyMap<string, DirectoryTree>;
};

/**
 * 構築途中のディレクトリーツリーです。
 */
type MutableDirectoryTree = {
  /**
   * このディレクトリー直下のルートファイルです。
   */
  readonly files: RouteFile[];

  /**
   * サブディレクトリー名からツリーへのマップです。
   */
  readonly directories: Map<string, MutableDirectoryTree>;
};

/**
 * ディレクトリーの直下にある 1 件のルート要素です。
 */
type RouteEntry = {
  /**
   * URL に現れるパスセグメントです。
   * パスレスディレクトリーでは空文字になります。
   */
  readonly segment: string;

  /**
   * ファイルまたはディレクトリーの絶対パスです。
   */
  readonly sourcePath: string;
};

const INDEX_BASENAME = "_index";
const LAYOUT_BASENAME = "_layout";
const DYNAMIC_PREFIX = "$";
const WILDCARD_SEGMENT = "*";
const BRACKET_ESCAPE = /\[([^[\]]*)\]/gu;

/**
 * ファイル名またはディレクトリー名から `[x]` 形式のエスケープを解除します。
 *
 * 例えば `sitemap[.]xml` は `sitemap.xml` になります。
 *
 * @param name エスケープを解除する対象の名前です。
 * @returns エスケープを解除した名前です。
 */
function unescapeName(name: string): string {
  return name.replace(BRACKET_ESCAPE, "$1");
}

/**
 * ファイルのベース名を URL のパスセグメントへ変換します。
 *
 * - `$` だけの名前はワイルドカードの `*` になります。
 * - `$name` は名前付きパラメーターの `:name` になります。
 * - それ以外は、そのままの名前です。
 *
 * @param basename 拡張子を除いたファイル名です。
 * @returns URL のパスセグメントです。
 */
function fileToSegment(basename: string): string {
  if (!basename.startsWith(DYNAMIC_PREFIX)) {
    return unescapeName(basename);
  }

  const name = unescapeName(basename.slice(DYNAMIC_PREFIX.length));

  return name === "" ? WILDCARD_SEGMENT : `:${name}`;
}

/**
 * ディレクトリー名を URL のパスセグメントへ変換します。
 *
 * `_` で始まるディレクトリーは、URL に現れないパスレスディレクトリーとして空文字を返します。
 *
 * @param name ディレクトリー名です。
 * @returns URL のパスセグメントです。
 */
function directoryToSegment(name: string): string {
  return name.startsWith("_") ? "" : unescapeName(name);
}

/**
 * 親パスにセグメントを結合します。
 *
 * @param parentPath 親のパスです。
 * @param segment 結合するセグメントです。
 * @returns 結合後のパスです。
 */
function joinUrlPath(parentPath: string, segment: string): string {
  return parentPath === "/" ? `/${segment}` : `${parentPath}/${segment}`;
}

/**
 * ページディレクトリーが存在することを確認します。
 *
 * @param directoryPath 確認する対象の絶対パスです。
 */
function assertDirectory(directoryPath: string): void {
  let stats: fs.Stats;

  try {
    stats = fs.statSync(directoryPath);
  } catch {
    throw new Error(`ルートディレクトリーが見つかりません: ${directoryPath}`);
  }

  if (!stats.isDirectory()) {
    throw new Error(`ルートディレクトリーではありません: ${directoryPath}`);
  }
}

/**
 * ページディレクトリー配下から、include に一致し exclude に一致しないファイルを列挙します。
 *
 * glob の評価には Node.js 組み込みの `fs.globSync` を使い、exclude を優先します。
 *
 * @param directoryPath ページディレクトリーの絶対パスです。
 * @param include ルートとして扱うファイルの glob パターンです。
 * @param exclude ルートから除外するファイルの glob パターンです。
 * @returns ページディレクトリーからの相対パスを `/` 区切りにしてソートした一覧です。
 */
function listRouteFiles(
  directoryPath: string,
  include: readonly string[],
  exclude: readonly string[],
): readonly string[] {
  assertDirectory(directoryPath);

  const entries = fs.globSync(include, {
    cwd: directoryPath,
    exclude,
    withFileTypes: true,
  });
  const relativePaths = new Set<string>();

  for (const entry of entries) {
    if (!entry.isFile()) {
      continue;
    }

    const filePath = path.resolve(entry.parentPath, entry.name);
    relativePaths.add(normalizePath(path.relative(directoryPath, filePath)));
  }

  return [...relativePaths].toSorted();
}

/**
 * ルートファイルの相対パスの一覧から、ディレクトリー階層のツリーを構築します。
 *
 * @param directoryPath ページディレクトリーの絶対パスです。
 * @param relativePaths ページディレクトリーからの相対パスの一覧です。
 * @returns ディレクトリー階層のツリーです。
 */
function buildDirectoryTree(
  directoryPath: string,
  relativePaths: readonly string[],
): DirectoryTree {
  const root: MutableDirectoryTree = { files: [], directories: new Map() };

  for (const relativePath of relativePaths) {
    const segments = relativePath.split("/").filter((segment) => segment !== "");

    if (segments.length === 0 || segments.includes("..") || path.isAbsolute(relativePath)) {
      throw new Error(
        `ページディレクトリーの外を指す include パターンは使えません: ${relativePath}`,
      );
    }

    let node = root;

    for (const segment of segments.slice(0, -1)) {
      let child = node.directories.get(segment);

      if (child === undefined) {
        child = { files: [], directories: new Map() };
        node.directories.set(segment, child);
      }

      node = child;
    }

    const fileName = segments[segments.length - 1]!;
    const extension = path.extname(fileName);

    node.files.push({
      basename: extension === "" ? fileName : fileName.slice(0, -extension.length),
      filePath: path.resolve(directoryPath, ...segments),
    });
  }

  return root;
}

/**
 * ルートノードを作成します。
 *
 * @param path ルートのパスパターンです。
 * @param index インデックスルートかどうかです。
 * @param modulePath ページモジュールの絶対パスです。
 * @param children 子ルートです。
 * @returns 作成したルートノードです。
 */
function createRouteNode(
  path: string,
  index: boolean,
  modulePath: string,
  children: readonly RouteNode[],
): RouteNode {
  return { path, index, modulePath, children };
}

/**
 * 同じパスのルート同士で、インデックスルートをレイアウトより先に並べます。
 *
 * `processRoutes` は同じ詳細度のルートを定義順のまま扱うため、インデックスを先に置くことで描画のときにレイアウトがインデックスを包むようになります。
 *
 * @param a 比較する 1 つ目のルートノードです。
 * @param b 比較する 2 つ目のルートノードです。
 * @returns 並べ替え用の比較結果です。
 */
function compareRouteNodes(a: RouteNode, b: RouteNode): number {
  if (a.path !== b.path) {
    return 0;
  }

  return Number(b.index) - Number(a.index);
}

/**
 * ディレクトリーツリーを再帰的に走査し、ルートノードの配列へ変換します。
 *
 * ディレクトリーに `_layout` があれば、そのレイアウトを親として同じ階層のルートを子にまとめます。
 * `_layout` がなければ、ルートはそのまま親の子へ引き上げられます。
 *
 * @param tree 変換する対象のディレクトリーツリーです。
 * @param directoryPath このディレクトリーの絶対パスです。
 * @param urlPath このディレクトリーに対応するパスです。
 * @param pathless URL に現れないパスレスディレクトリーかどうかです。
 * @returns このディレクトリーが親へ提供するルートノードの一覧です。
 */
function convertDirectory(
  tree: DirectoryTree,
  directoryPath: string,
  urlPath: string,
  pathless: boolean,
): readonly RouteNode[] {
  let index: string | undefined;
  let layout: string | undefined;
  const pages: RouteEntry[] = [];
  const fileSegments = new Map<string, string>();
  const files = tree.files.toSorted((a, b) => compareFileBasenames(a.basename, b.basename));

  for (const file of files) {
    switch (file.basename) {
      case INDEX_BASENAME: {
        if (index !== undefined) {
          throw new Error(`インデックスルートが重複しています: ${index}, ${file.filePath}`);
        }

        index = file.filePath;
        continue;
      }
      case LAYOUT_BASENAME: {
        if (layout !== undefined) {
          throw new Error(`レイアウトルートが重複しています: ${layout}, ${file.filePath}`);
        }

        layout = file.filePath;
        continue;
      }
    }

    if (file.basename.startsWith("_")) {
      throw new Error(
        `ルートとして解釈できないファイルです: ${file.filePath}（_ で始められるのは _index と _layout だけです）`,
      );
    }

    const segment = fileToSegment(file.basename);
    const duplicate = fileSegments.get(segment);

    if (duplicate !== undefined) {
      throw new Error(`同じパスになるルートが重複しています: ${duplicate}, ${file.filePath}`);
    }

    fileSegments.set(segment, file.filePath);
    pages.push({ segment, sourcePath: file.filePath });
  }

  if (pathless && layout !== undefined) {
    throw new Error(
      `パスレスディレクトリーには _layout を置けません: ${directoryPath}（レイアウトは共通のパスセグメントを持つディレクトリーに置いてください）`,
    );
  }

  const nodes: RouteNode[] = [];

  if (index !== undefined) {
    nodes.push(createRouteNode(urlPath, true, index, []));
  }

  for (const page of pages) {
    nodes.push(createRouteNode(joinUrlPath(urlPath, page.segment), false, page.sourcePath, []));
  }

  for (const [name, child] of tree.directories) {
    const segment = directoryToSegment(name);
    const childUrlPath = segment === "" ? urlPath : joinUrlPath(urlPath, segment);
    nodes.push(
      ...convertDirectory(child, path.resolve(directoryPath, name), childUrlPath, segment === ""),
    );
  }

  nodes.sort(compareRouteNodes);

  return layout === undefined ? nodes : [createRouteNode(urlPath, false, layout, nodes)];
}

/**
 * ファイル名を辞書順で比較します。
 *
 * 同一ディレクトリーのファイルは走査の時点で整列済みのため、実質的には等価判定として働きます。
 * 将来の呼び出し順の変更に備えて、全順序になるよう定義しています。
 *
 * @param a 比較する 1 つ目のファイル名です。
 * @param b 比較する 2 つ目のファイル名です。
 * @returns 並べ替え用の比較結果です。
 */
export function compareFileBasenames(a: string, b: string): number {
  if (a < b) {
    return -1;
  }

  if (a > b) {
    return 1;
  }

  return 0;
}

/**
 * ページディレクトリーを走査し、ファイル構成に対応するルートノードの配列を生成します。
 *
 * 対象ファイルは `include` と `exclude` の glob パターンで決まり、`exclude` が優先されます。
 * パターンはページディレクトリーからの相対パスで評価されます。
 *
 * 変換規則は次のとおりです。
 *
 * - `_index.tsx` は、そのディレクトリーのインデックスルートになります。
 * - `_layout.tsx` は、そのディレクトリーのレイアウトルートになり、同じ階層のルートを子に持ちます。
 * - `$id.tsx` は、名前付きパラメーターの `:id` になります。
 * - `$.tsx` は、ワイルドカードの `*` になります。
 * - その他のファイル名とディレクトリー名は、そのままパスセグメントになります。
 * - `_` で始まるディレクトリーは、URL に現れないパスレスディレクトリーになります（`_layout` は置けません）。
 *
 * @param args 探索に必要な設定です。
 * @returns ルートノードの配列です。
 */
export default function scanRoutes(args: ScanRoutesArgs): readonly RouteNode[] {
  const directoryPath = path.resolve(args.root, args.dir);
  const relativePaths = listRouteFiles(directoryPath, args.include, args.exclude);
  const tree = buildDirectoryTree(directoryPath, relativePaths);

  return convertDirectory(tree, directoryPath, "/", false);
}

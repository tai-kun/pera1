import fs from "node:fs";
import path from "node:path";

import normalizePath from "./_path.js";
import scanRoutes, { type RouteNode } from "./_scan-routes.js";

/**
 * ルート型の生成に必要な設定です。
 */
export type GenerateTypesArgs = {
  /**
   * プロジェクトルートの絶対パスです。
   */
  readonly root: string;

  /**
   * ページディレクトリーの、プロジェクトルートからの相対パスです。
   */
  readonly dir: string;

  /**
   * 型の生成先の、プロジェクトルートからの相対パスです。
   */
  readonly typesDir: string;

  /**
   * ルートとして扱うファイルの glob パターンです。ページディレクトリーからの相対パスで指定します。
   */
  readonly include: readonly string[];

  /**
   * ルートから除外するファイルの glob パターンです。ページディレクトリーからの相対パスで指定します。
   */
  readonly exclude: readonly string[];
};

/**
 * ルート型の生成結果です。
 */
export type GenerateTypesResult = {
  /**
   * 新しく生成または更新した型ファイルの絶対パスの一覧です。
   */
  readonly written: readonly string[];

  /**
   * 不要になったため削除した型ファイルの絶対パスの一覧です。
   */
  readonly removed: readonly string[];

  /**
   * 型を生成できなかったルートなどに対する警告の一覧です。
   */
  readonly warnings: readonly string[];
};

/**
 * ルート型を格納するディレクトリー名です。
 *
 * TypeScript の `rootDirs` は、ルートファイルからの `./+types/...` という相対インポートを
 * 型ディレクトリー内の同じ位置へ解決するために使われます。
 */
const typesDirectoryName = "+types";

/**
 * 型ファイルの拡張子です。
 */
const typeFileExtension = ".d.ts";

/**
 * 生成ディレクトリー自身を git の管理対象外にする `.gitignore` のファイル名です。
 */
const gitIgnoreFileName = ".gitignore";

/**
 * `.gitignore` の内容です。ディレクトリー配下のすべてを無視します。
 */
const gitIgnoreContent = "*\n";

/**
 * `.gitignore` を出力するディレクトリーを決めます。
 *
 * 既定では型ディレクトリーの親（`.pera1/types` なら `.pera1`）に出力し、生成物全体を無視します。
 * 親がプロジェクトルートと一致する場合や、プロジェクトの外にある場合、ファイルシステムのルートに
 * なる場合は、型ディレクトリー自身に出力します。プロジェクトルートが対象になる場合は `undefined` を返します。
 *
 * @param root プロジェクトルートの絶対パスです。
 * @param typesDirectory 型ディレクトリーの絶対パスです。
 * @returns `.gitignore` を出力するディレクトリー、または出力できない場合は `undefined` です。
 */
function resolveGitIgnoreDirectory(root: string, typesDirectory: string): string | undefined {
  if (typesDirectory === root) {
    return undefined;
  }

  const parent = path.dirname(typesDirectory);
  const relativeParent = path.relative(root, parent);
  const isInsideRoot =
    relativeParent !== "" && !relativeParent.startsWith("..") && !path.isAbsolute(relativeParent);

  if (isInsideRoot && parent !== path.dirname(parent)) {
    return parent;
  }

  return typesDirectory;
}

/**
 * 生成物を git の管理対象外にする `.gitignore` を出力します。
 *
 * 内容が同じなら書き換えません。
 *
 * @param root プロジェクトルートの絶対パスです。
 * @param typesDirectory 型ディレクトリーの絶対パスです。
 */
function ensureGitIgnore(root: string, typesDirectory: string): void {
  const gitIgnoreDirectory = resolveGitIgnoreDirectory(root, typesDirectory);

  if (gitIgnoreDirectory === undefined) {
    return;
  }

  const gitIgnorePath = path.join(gitIgnoreDirectory, gitIgnoreFileName);
  const existing = fs.existsSync(gitIgnorePath)
    ? fs.readFileSync(gitIgnorePath, "utf8")
    : undefined;

  if (existing === gitIgnoreContent) {
    return;
  }

  fs.mkdirSync(gitIgnoreDirectory, { recursive: true });
  fs.writeFileSync(gitIgnorePath, gitIgnoreContent);
}

/**
 * ルートノードを走査し、ページモジュールの絶対パスからルートのパスパターンへのマップを作成します。
 *
 * @param nodes 走査の対象となるルートノードです。
 * @param routePaths 追加先のマップです。
 * @returns ページモジュールの絶対パスからパスパターンへのマップです。
 */
function collectRoutePaths(
  nodes: readonly RouteNode[],
  routePaths: Map<string, string> = new Map(),
): Map<string, string> {
  for (const node of nodes) {
    routePaths.set(node.modulePath, node.path);
    collectRoutePaths(node.children, routePaths);
  }

  return routePaths;
}

/**
 * ページモジュールに対応する型ファイルの絶対パスを計算します。
 *
 * 型ファイルは、プロジェクトルートからのページモジュールの相対パスを型ディレクトリー内に再現し、
 * その隣に `+types` ディレクトリーを作って配置します。
 *
 * @param root プロジェクトルートの絶対パスです。
 * @param typesDirectory 型ディレクトリーの絶対パスです。
 * @param modulePath ページモジュールの絶対パスです。
 * @returns 型ファイルの絶対パス、またはプロジェクトルートの外にある場合は `undefined` です。
 */
function toTypeFilePath(
  root: string,
  typesDirectory: string,
  modulePath: string,
): string | undefined {
  const relativePath = path.relative(root, modulePath);

  if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
    return undefined;
  }

  const directory = path.dirname(relativePath);
  const basename = path.basename(relativePath, path.extname(relativePath));

  return path.join(
    typesDirectory,
    directory,
    typesDirectoryName,
    `${basename}${typeFileExtension}`,
  );
}

/**
 * ルートファイルが import する型定義の内容を生成します。
 *
 * @param sourcePath プロジェクトルートからのルートファイルの相対パスです。
 * @param routePath ルートのパスパターンです。
 * @returns 型定義ファイルの内容です。
 */
function generateTypeFileContent(sourcePath: string, routePath: string): string {
  return [
    "// このファイルは @pera1/vite によって自動生成されます。編集しないでください。",
    "",
    "import type {",
    "  ActionFunctionArgs,",
    "  LoaderFunctionArgs,",
    "  RouteParams,",
    "  ShouldReloadFunctionArgs,",
    '} from "@pera1/vite";',
    "",
    "/**",
    ` * \`${sourcePath}\` のルート型です。`,
    " */",
    "export namespace Route {",
    "  /**",
    "   * ルートのパスパターンです。",
    "   */",
    `  export type Path = ${JSON.stringify(routePath)};`,
    "",
    "  /**",
    "   * パスパターンから導出されるパスパラメーターです。",
    "   */",
    "  export type Params = RouteParams<Path>;",
    "",
    "  /**",
    "   * `loader` 関数の引数です。",
    "   */",
    "  export type LoaderArgs = LoaderFunctionArgs<Path>;",
    "",
    "  /**",
    "   * `action` 関数の引数です。",
    "   */",
    "  export type ActionArgs = ActionFunctionArgs<Path>;",
    "",
    "  /**",
    "   * `shouldReload` 関数の引数です。",
    "   */",
    "  export type ShouldReloadArgs = ShouldReloadFunctionArgs<Path>;",
    "}",
    "",
  ].join("\n");
}

/**
 * 型ディレクトリーの配下にある、既存の型ファイルを再帰的に列挙します。
 *
 * @param directory 走査する対象のディレクトリーの絶対パスです。
 * @returns 既存の型ファイルの絶対パスの一覧です。
 */
function collectExistingTypeFiles(directory: string): readonly string[] {
  if (!fs.existsSync(directory)) {
    return [];
  }

  const files: string[] = [];

  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (!entry.isDirectory()) {
      continue;
    }

    const entryPath = path.join(directory, entry.name);

    if (entry.name === typesDirectoryName) {
      for (const file of fs.readdirSync(entryPath, { withFileTypes: true })) {
        if (file.isFile() && file.name.endsWith(typeFileExtension)) {
          files.push(path.join(entryPath, file.name));
        }
      }
    } else {
      files.push(...collectExistingTypeFiles(entryPath));
    }
  }

  return files;
}

/**
 * 空になったディレクトリーを再帰的に削除します。
 *
 * @param directory 削除を試みる対象のディレクトリーの絶対パスです。
 * @returns ディレクトリーが空だった場合は `true` です。
 */
function removeEmptyDirectories(directory: string): boolean {
  if (!fs.existsSync(directory)) {
    return true;
  }

  let empty = true;

  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!removeEmptyDirectories(path.join(directory, entry.name))) {
        empty = false;
      }
    } else {
      empty = false;
    }
  }

  if (empty) {
    fs.rmdirSync(directory);
  }

  return empty;
}

/**
 * ファイル構成からルート型を生成し、型ディレクトリーを同期します。
 *
 * 生成するのは `Route` 名前空間を持つ `.d.ts` ファイルです。内容が変わっていないファイルは
 * 書き換えず、ルートファイルがなくなった型ファイルは削除します。
 *
 * あわせて、生成物が git に追跡されないよう、生成ディレクトリー（既定では `.pera1`）に
 * `*` だけを書いた `.gitignore` を出力します。
 *
 * @param args 生成に必要な設定です。
 * @returns 生成および削除したファイルと警告の一覧です。
 */
export default function generateTypes(args: GenerateTypesArgs): GenerateTypesResult {
  const nodes = scanRoutes(args);
  const typesDirectory = path.resolve(args.root, args.typesDir);
  ensureGitIgnore(args.root, typesDirectory);
  const routePaths = collectRoutePaths(nodes);
  const written: string[] = [];
  const removed: string[] = [];
  const warnings: string[] = [];
  const expected = new Set<string>();

  for (const [modulePath, routePath] of routePaths) {
    const typeFilePath = toTypeFilePath(args.root, typesDirectory, modulePath);

    if (typeFilePath === undefined) {
      warnings.push(
        `プロジェクトルートの外にあるルートファイルには型を生成できません: ${modulePath}`,
      );
      continue;
    }

    expected.add(typeFilePath);

    const content = generateTypeFileContent(
      normalizePath(path.relative(args.root, modulePath)),
      routePath,
    );
    const existing = fs.existsSync(typeFilePath)
      ? fs.readFileSync(typeFilePath, "utf8")
      : undefined;

    // 内容が同じなら書き換えません。開発サーバーのファイル監視を不要に反応させないためです。
    if (existing === content) {
      continue;
    }

    fs.mkdirSync(path.dirname(typeFilePath), { recursive: true });
    fs.writeFileSync(typeFilePath, content);
    written.push(typeFilePath);
  }

  for (const existing of collectExistingTypeFiles(typesDirectory)) {
    if (expected.has(existing)) {
      continue;
    }

    fs.rmSync(existing);
    removed.push(existing);
  }

  if (fs.existsSync(typesDirectory)) {
    for (const entry of fs.readdirSync(typesDirectory, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        removeEmptyDirectories(path.join(typesDirectory, entry.name));
      }
    }
  }

  return { written, removed, warnings };
}

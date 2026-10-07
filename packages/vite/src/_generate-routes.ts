import path from "node:path";

import normalizePath from "./_path.js";
import type { RouteNode } from "./_scan-routes.js";

/**
 * ルートモジュールの生成に必要な設定です。
 */
export type GenerateRoutesArgs = {
  /**
   * インポートの解決に使うプロジェクトルートの絶対パスです。
   */
  readonly root: string;

  /**
   * 生成対象のルートノードです。
   */
  readonly nodes: readonly RouteNode[];
};

/**
 * 生成中のコードが参照するモジュールと識別子を管理する状態です。
 */
type GenerationContext = {
  /**
   * インポートの解決に使うプロジェクトルートの絶対パスです。
   */
  readonly root: string;

  /**
   * ページモジュールの絶対パスから、生成コード上の識別子へのマップです。
   */
  readonly identifiers: Map<string, string>;

  /**
   * 生成するインポート文の一覧です。
   */
  readonly imports: string[];
};

/**
 * ページモジュールを、仮想モジュールから解決できるインポートパスへ変換します。
 *
 * プロジェクトルートの配下はルート相対のパスにし、配下でない場合は Vite の `/@fs/` を使います。
 *
 * @param root プロジェクトルートの絶対パスです。
 * @param modulePath ページモジュールの絶対パスです。
 * @returns インポートに使うパスです。
 */
function toImportPath(root: string, modulePath: string): string {
  const relativePath = normalizePath(path.relative(root, modulePath));

  if (relativePath.startsWith("../") || path.isAbsolute(relativePath)) {
    return `/@fs/${normalizePath(modulePath)}`;
  }

  return `/${relativePath}`;
}

/**
 * ページモジュールに対応する識別子を取得し、未登録ならインポート文を追加します。
 *
 * @param context 生成中の状態です。
 * @param modulePath ページモジュールの絶対パスです。
 * @returns ページモジュールを参照する識別子です。
 */
function getIdentifier(context: GenerationContext, modulePath: string): string {
  let identifier = context.identifiers.get(modulePath);

  if (identifier === undefined) {
    identifier = `_pera1_route_${context.identifiers.size}`;
    context.identifiers.set(modulePath, identifier);
    context.imports.push(
      `import * as ${identifier} from ${JSON.stringify(toImportPath(context.root, modulePath))};`,
    );
  }

  return identifier;
}

/**
 * ルートノードの配列を、コード上の配列リテラルへ変換します。
 *
 * @param nodes 変換する対象のルートノードです。
 * @param context 生成中の状態です。
 * @param indent 現在のインデントです。
 * @returns 配列リテラルのコードです。
 */
function serializeNodes(
  nodes: readonly RouteNode[],
  context: GenerationContext,
  indent: string,
): string {
  if (nodes.length === 0) {
    return "[]";
  }

  const childIndent = `${indent}  `;
  const items = nodes.map((node) => `${childIndent}${serializeNode(node, context, childIndent)}`);

  return `[\n${items.join(",\n")},\n${indent}]`;
}

/**
 * ルートノードを、コード上のオブジェクトリテラルへ変換します。
 *
 * ページモジュールの名前空間を展開したうえで、ファイル構成から決まる `path`、`index`、`children` で
 * 上書きします。名前空間の展開では `Symbol.toStringTag` が失われるため、`default` エクスポートの
 * 解決は `processRoutes` 側の判定に委ねます。
 *
 * @param node 変換する対象のルートノードです。
 * @param context 生成中の状態です。
 * @param indent 現在のインデントです。
 * @returns オブジェクトリテラルのコードです。
 */
function serializeNode(node: RouteNode, context: GenerationContext, indent: string): string {
  const identifier = getIdentifier(context, node.modulePath);
  const childIndent = `${indent}  `;
  const lines = [`...${identifier},`, `path: ${JSON.stringify(node.path)},`];

  if (node.index) {
    lines.push("index: true,");
  }

  if (node.children.length > 0) {
    lines.push(`children: ${serializeNodes(node.children, context, childIndent)},`);
  }

  return `{\n${lines.map((line) => `${childIndent}${line}`).join("\n")}\n${indent}}`;
}

/**
 * ルートノードから、ルート定義をエクスポートする仮想モジュールのコードを生成します。
 *
 * 生成されるモジュールは `routes` とそのデフォルトエクスポートを提供します。
 *
 * @param args 生成に必要な設定です。
 * @returns 仮想モジュールのコードです。
 */
export default function generateRoutesModule(args: GenerateRoutesArgs): string {
  const context: GenerationContext = {
    root: args.root,
    identifiers: new Map(),
    imports: [],
  };
  const body = serializeNodes(args.nodes, context, "");

  return [
    "// このファイルは @pera1/vite によって自動生成されます。編集しないでください。",
    ...context.imports,
    "",
    `export const routes = ${body};`,
    "",
    "export default routes;",
    "",
  ].join("\n");
}

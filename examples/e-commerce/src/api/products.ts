export type Product = {
  readonly id: string;
  readonly name: string;
  readonly price: number;
  readonly category: string;
  readonly description: string;
};

const products = new Map<string, Product>([
  ["p1", { id: "p1", name: "TypeScript Handbook", price: 3200, category: "books", description: "TypeScript の公式ハンドブック日本語版です。" }],
  ["p2", { id: "p2", name: "React Patterns", price: 2800, category: "books", description: "React の実践パターンを集めた書籍です。" }],
  ["p3", { id: "p3", name: "Clean Architecture", price: 3600, category: "books", description: "クリーンアーキテクチャの解説書です。" }],
  ["p4", { id: "p4", name: "Wireless Mouse", price: 4500, category: "electronics", description: "静音ワイヤレスマウスです。" }],
  ["p5", { id: "p5", name: "USB-C Hub", price: 6800, category: "electronics", description: "7-in-1 USB-C ハブです。" }],
  ["p6", { id: "p6", name: "Mechanical Keyboard", price: 12800, category: "electronics", description: "打鍵感の良いメカニカルキーボードです。" }],
  ["p7", { id: "p7", name: "Cotton T-Shirt", price: 1980, category: "clothing", description: "綿100% の T シャツです。" }],
  ["p8", { id: "p8", name: "Denim Jacket", price: 8900, category: "clothing", description: "定番デニムジャケットです。" }],
  ["p9", { id: "p9", name: "Running Shoes", price: 11000, category: "clothing", description: "軽量ランニングシューズです。" }],
  ["p10", { id: "p10", name: "Notebook Pro", price: 2400, category: "books", description: "方眼ノートのプロ仕様です。" }],
]);

export const PAGE_SIZE = 4;

export const CATEGORIES: readonly string[] = ["books", "electronics", "clothing"];

export type ProductListQuery = {
  readonly category: string;
  readonly sort: string;
  readonly page: number;
};

export type ProductListResult = {
  readonly category: string;
  readonly sort: string;
  readonly page: number;
  readonly pageSize: number;
  readonly total: number;
  readonly totalPages: number;
  readonly products: Product[];
  readonly categories: readonly string[];
};

function normalizeSort(sort: string): "price" | "name" | "" {
  if (sort === "price" || sort === "name") {
    return sort;
  }
  return "";
}

export async function listProducts(query: ProductListQuery): Promise<ProductListResult> {
  const category = query.category.trim();
  const sort = normalizeSort(query.sort.trim());
  const filtered =
    category === "" ? [...products.values()] : [...products.values()].filter((p) => p.category === category);
  const sorted = [...filtered].sort((a, b) => {
    if (sort === "price") {
      return a.price - b.price;
    }
    if (sort === "name") {
      return a.name.localeCompare(b.name);
    }
    return 0;
  });
  const safePage = Number.isInteger(query.page) && query.page > 0 ? query.page : 1;
  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const currentPage = Math.min(safePage, totalPages);
  const start = (currentPage - 1) * PAGE_SIZE;
  return {
    category,
    sort,
    page: currentPage,
    pageSize: PAGE_SIZE,
    total: sorted.length,
    totalPages,
    products: sorted.slice(start, start + PAGE_SIZE),
    categories: CATEGORIES,
  };
}

export async function findProduct(id: string): Promise<Product | undefined> {
  return products.get(id);
}

export async function listProductsByCategory(category: string): Promise<Product[]> {
  return [...products.values()].filter((p) => p.category === category);
}

export async function listCategories(): Promise<readonly string[]> {
  return CATEGORIES;
}

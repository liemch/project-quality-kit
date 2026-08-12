/**
 * Shared seed / list-item factories for domain harnesses.
 *
 * VI: Dùng trong e2e/fixtures/domains/*.ts để seed mock list ổn định, có keyword search.
 * EN: Use inside domain harness seed() for stable mock lists + keyword fields.
 *
 * @example
 * seed: (i) => makeListItem({
 *   id: i,
 *   code: i === 1 ? "00280129" : padCode("TPL", i),
 *   name: `Item ${i}`,
 *   keywordFields: ["code", "name"],
 * })
 */

export function padCode(prefix: string, i: number, width = 4): string {
  return `${prefix}-${String(i).padStart(width, "0")}`;
}

export type ListItemSeed = Record<string, unknown> & {
  id?: number | string;
  code?: string;
  name?: string;
  isActive?: boolean;
  /** Fields concatenated into `searchText` (lowercased) for keyword mocks */
  keywordFields?: string[];
  searchText?: string;
};

/**
 * Build a list row with optional `searchText` for Keyword/Contains mocks
 * (mirrors many AM-style GetList* handlers: match code OR name).
 */
export function makeListItem(input: ListItemSeed): Record<string, unknown> {
  const { keywordFields, searchText: explicit, ...rest } = input;
  const fields = keywordFields?.length ? keywordFields : ["code", "name"];
  const parts = fields.map((f) => String((rest as Record<string, unknown>)[f] ?? "")).filter(Boolean);
  const searchText = (explicit ?? parts.join(" ")).toLowerCase();
  return {
    isActive: true,
    ...rest,
    searchText,
  };
}

/** Seed N items via factory (1-based index). */
export function seedMany<T extends Record<string, unknown>>(
  count: number,
  factory: (i: number) => T,
): T[] {
  return Array.from({ length: count }, (_, idx) => factory(idx + 1));
}

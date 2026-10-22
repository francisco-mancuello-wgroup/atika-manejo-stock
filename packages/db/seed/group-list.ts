import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import ExcelJS from "exceljs";
import { createPrismaClient, type Prisma } from "../src/index";
import { cellText, collapse, normalizeLabel } from "./excel/cells";
import { capAllocation, type GroupInput, readGroupInput } from "./group";

export interface GroupListInput extends GroupInput {
  dryRun: boolean;
}

/** One "<qty> <size>" line of the event list; `row` is the worksheet row for error messages. */
export interface StockLine {
  description: string;
  size: string;
  qty: number;
  row: number;
}

export interface CatalogProduct {
  id: string;
  code: string | null;
  name: string;
  variants: { id: string; size: string; stock: number }[];
}

export interface ResolvedLine {
  variantId: string;
  productName: string;
  size: string;
  qty: number;
  variantStock: number;
}

export interface GroupListEntry {
  productName: string;
  size: string;
  qty: number;
  allocated: number;
  capped: boolean;
}

export interface GroupListSummary {
  matched: number;
  units: number;
  capped: number;
  removed: number;
  keptForHistory: number;
  dryRun: boolean;
  entries: GroupListEntry[];
  removedLabels: string[];
  keptLabels: string[];
  /** Lines settled by a matching rule (compound size, one-size product, size-based pick). */
  ruleResolved: string[];
}

/** Same inputs as `db:group` (GROUP_LOT is ignored: the list spans every lot) plus DRY_RUN=1. */
export function readGroupListInput(env: Record<string, string | undefined>): GroupListInput {
  const dry = env.DRY_RUN?.trim().toLowerCase();
  return {
    ...readGroupInput(env),
    dryRun: dry === "1" || dry === "true" || dry === "yes",
  };
}

/** "1 S", "2 u" and "1M" -> quantity (integer >= 1) and uppercase size; anything else is null. */
export function parseTalles(text: string): { qty: number; size: string } | null {
  const match = /^(\d+)\s*([A-Za-z]+)$/.exec(collapse(text));
  if (!match) return null;
  const qty = Number(match[1]);
  if (!Number.isInteger(qty) || qty < 1) return null;
  return { qty, size: (match[2] ?? "").toUpperCase() };
}

/**
 * Reads the first worksheet by header label (DESCRIPCION, TALLES). Blank rows are skipped, a TALLES
 * value under an empty DESCRIPCION continues the previous product, and every unreadable row is
 * reported instead of dropped.
 */
export function parseStockList(workbook: ExcelJS.Workbook): {
  lines: StockLine[];
  problems: string[];
} {
  const sheet = workbook.worksheets[0];
  if (!sheet) throw new Error("The workbook has no worksheet");
  const columns = new Map<string, number>();
  sheet.getRow(1).eachCell((cell, column) => {
    const label = cellText(cell);
    if (label) columns.set(normalizeLabel(label), column);
  });
  const find = (label: string): number => {
    const column = columns.get(label);
    if (!column) throw new Error(`Header ${label} not found in row 1 of ${sheet.name}`);
    return column;
  };
  const descriptionColumn = find("DESCRIPCION");
  const sizeColumn = find("TALLES");

  const lines: StockLine[] = [];
  const problems: string[] = [];
  let previous: string | null = null;
  for (let index = 2; index <= sheet.rowCount; index++) {
    const row = sheet.getRow(index);
    const own = cellText(row.getCell(descriptionColumn));
    const talles = cellText(row.getCell(sizeColumn));
    if (own) previous = own;
    if (!talles) continue;
    const description = own ?? previous;
    if (!description) {
      problems.push(`row ${index}: "${talles}" has no product (empty DESCRIPCION, nothing above)`);
      continue;
    }
    const parsed = parseTalles(talles);
    if (!parsed) {
      problems.push(
        `row ${index}: ${description}: cannot read TALLES "${talles}" as "<qty> <size>"`,
      );
      continue;
    }
    lines.push({ description, size: parsed.size, qty: parsed.qty, row: index });
  }
  return { lines, problems };
}

type Variant = CatalogProduct["variants"][number];
type Pick = { variant: Variant; rule: string | null } | "none" | "unclear";

/**
 * Exact size first. Otherwise a variant whose "/"-parts contain the size (S -> "XS/S"), only when
 * exactly one fits; otherwise "U" maps to the only variant of a one-variant product.
 */
function pickVariant(product: CatalogProduct, size: string): Pick {
  const exact = product.variants.find((v) => v.size.toUpperCase() === size);
  if (exact) return { variant: exact, rule: null };
  const compound = product.variants.filter((v) =>
    v.size
      .toUpperCase()
      .split("/")
      .map((part) => part.trim())
      .includes(size),
  );
  const [first] = compound;
  if (first && compound.length === 1) return { variant: first, rule: "compound size" };
  if (compound.length > 1) return "unclear";
  const [only] = product.variants;
  if (size === "U" && only && product.variants.length === 1) {
    return { variant: only, rule: "one-size product" };
  }
  return "none";
}

/**
 * Matches each line to a variant: exact normalized code first, then exact normalized name. A name
 * shared by several products is resolved only when exactly one of them has the size. Sizes follow
 * `pickVariant`. Every line settled by a rule is described in `notes`. Repeated lines add up.
 */
export function resolveStockList(
  lines: StockLine[],
  products: CatalogProduct[],
): { resolved: ResolvedLine[]; problems: string[]; notes: string[] } {
  const byCode = new Map<string, CatalogProduct[]>();
  const byName = new Map<string, CatalogProduct[]>();
  const push = (map: Map<string, CatalogProduct[]>, key: string, product: CatalogProduct) => {
    map.set(key, [...(map.get(key) ?? []), product]);
  };
  for (const product of products) {
    if (product.code?.trim()) push(byCode, normalizeLabel(product.code), product);
    push(byName, normalizeLabel(product.name), product);
  }

  const problems: string[] = [];
  const notes: string[] = [];
  const merged = new Map<string, ResolvedLine>();
  for (const line of lines) {
    const key = normalizeLabel(line.description);
    const matches = byCode.get(key) ?? byName.get(key) ?? [];
    if (matches.length === 0) {
      problems.push(`row ${line.row}: "${line.description}" matches no product`);
      continue;
    }
    const candidates = matches.map((product) => ({
      product,
      pick: pickVariant(product, line.size),
    }));
    let chosen: { product: CatalogProduct; pick: Pick } | undefined;
    let byProductSize = false;
    if (matches.length === 1) chosen = candidates[0];
    else {
      const fitting = candidates.filter(({ pick }) => typeof pick === "object");
      if (fitting.length === 1) {
        chosen = fitting[0];
        byProductSize = true;
      } else if (fitting.length > 1) {
        problems.push(
          `row ${line.row}: "${line.description}" is ambiguous (matches ${fitting.length} products with size ${line.size})`,
        );
        continue;
      } else {
        problems.push(
          `row ${line.row}: "${line.description}" is ambiguous (matches ${matches.length} products, none with size ${line.size})`,
        );
        continue;
      }
    }
    if (!chosen || typeof chosen.pick !== "object") {
      problems.push(
        chosen?.pick === "unclear"
          ? `row ${line.row}: "${line.description}" size ${line.size} fits several variants`
          : `row ${line.row}: "${line.description}" has no size ${line.size}`,
      );
      continue;
    }
    const { product, pick } = chosen;
    const { variant } = pick;
    const rules = [byProductSize ? "only product with that size" : null, pick.rule].filter(Boolean);
    if (rules.length > 0) {
      notes.push(
        `row ${line.row}: "${line.description}" ${line.size} -> ${product.name} (${variant.size}) [${rules.join(", ")}]`,
      );
    }
    const current = merged.get(variant.id);
    if (current) current.qty += line.qty;
    else {
      merged.set(variant.id, {
        variantId: variant.id,
        productName: product.name,
        size: variant.size,
        qty: line.qty,
        variantStock: variant.stock,
      });
    }
  }
  return { resolved: [...merged.values()], problems, notes };
}

/**
 * Replaces the allocations of a group (created by name when missing, isActive untouched) with the
 * list. Leftover allocations are deleted when nothing was sold, or lowered to `sold` otherwise.
 * `variant.stock` is never written. Throws, writing nothing, when any line cannot be resolved.
 */
export async function applyGroupList(
  tx: Prisma.TransactionClient,
  input: {
    name: string;
    lines: StockLine[];
    startsAt?: Date | undefined;
    endsAt?: Date | undefined;
    dryRun?: boolean | undefined;
  },
): Promise<GroupListSummary> {
  const products = await tx.product.findMany({
    select: {
      id: true,
      code: true,
      name: true,
      variants: { select: { id: true, size: true, stock: true } },
    },
  });
  const { resolved, problems, notes } = resolveStockList(input.lines, products);
  if (problems.length > 0) {
    throw new Error(
      `${problems.length} problem(s) in the stock list, nothing was written:\n${problems
        .map((problem) => `  - ${problem}`)
        .join("\n")}`,
    );
  }

  const existing = await tx.publicationGroup.findFirst({ where: { name: input.name } });
  const currents = existing
    ? await tx.groupAllocation.findMany({
        where: { groupId: existing.id },
        include: { variant: { include: { product: { select: { name: true } } } } },
      })
    : [];
  const soldByVariant = new Map(currents.map((a) => [a.variantId, a.sold]));

  const entries = resolved.map((line) => ({
    line,
    allocated: capAllocation({
      stockActual: line.qty,
      variantStock: line.variantStock,
      sold: soldByVariant.get(line.variantId) ?? 0,
    }),
  }));
  const listed = new Set(resolved.map((line) => line.variantId));
  const leftovers = currents.filter((a) => !listed.has(a.variantId));
  const removed = leftovers.filter((a) => a.sold === 0);
  const kept = leftovers.filter((a) => a.sold > 0);
  const label = (a: (typeof currents)[number]) => `${a.variant.product.name} (${a.variant.size})`;

  if (!input.dryRun) {
    const window = {
      ...(input.startsAt ? { startsAt: input.startsAt } : {}),
      ...(input.endsAt ? { endsAt: input.endsAt } : {}),
    };
    const group = existing
      ? await tx.publicationGroup.update({ where: { id: existing.id }, data: window })
      : await tx.publicationGroup.create({ data: { name: input.name, ...window } });
    for (const { line, allocated } of entries) {
      await tx.groupAllocation.upsert({
        where: { groupId_variantId: { groupId: group.id, variantId: line.variantId } },
        update: { allocated },
        create: { groupId: group.id, variantId: line.variantId, allocated },
      });
    }
    if (removed.length > 0) {
      await tx.groupAllocation.deleteMany({ where: { id: { in: removed.map((a) => a.id) } } });
    }
    for (const a of kept) {
      await tx.groupAllocation.update({ where: { id: a.id }, data: { allocated: a.sold } });
    }
  }

  return {
    matched: entries.length,
    units: entries.reduce((sum, e) => sum + e.allocated, 0),
    capped: entries.filter((e) => e.line.qty > e.line.variantStock).length,
    removed: removed.length,
    keptForHistory: kept.length,
    dryRun: input.dryRun ?? false,
    entries: entries.map((e) => ({
      productName: e.line.productName,
      size: e.line.size,
      qty: e.line.qty,
      allocated: e.allocated,
      capped: e.line.qty > e.line.variantStock,
    })),
    removedLabels: removed.map(label),
    keptLabels: kept.map(label),
    ruleResolved: notes,
  };
}

/** Replaces a publication group's contents from an event "stock list" workbook. */
async function main(): Promise<void> {
  config({ path: fileURLToPath(new URL("../../../.env", import.meta.url)), quiet: true });
  const input = readGroupListInput(process.env);
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is required");
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(input.file);
  const { lines, problems } = parseStockList(workbook);
  if (problems.length > 0) {
    throw new Error(
      `${problems.length} problem(s) in the stock list, nothing was written:\n${problems
        .map((problem) => `  - ${problem}`)
        .join("\n")}`,
    );
  }
  const prisma = createPrismaClient(databaseUrl);
  try {
    const summary = await prisma.$transaction((tx) =>
      applyGroupList(tx, {
        name: input.name,
        lines,
        startsAt: input.startsAt,
        endsAt: input.endsAt,
        dryRun: input.dryRun,
      }),
    );
    console.log(`Group "${input.name}"${summary.dryRun ? " (DRY RUN, nothing written)" : ""}`);
    for (const e of summary.entries) {
      const note = e.capped ? `  capped (listed ${e.qty})` : "";
      console.log(`    ${e.productName} ${e.size}: ${e.allocated}${note}`);
    }
    console.log(`  matched lines: ${summary.matched}`);
    console.log(`  units allocated: ${summary.units}`);
    console.log(`  capped lines (qty > stock): ${summary.capped}`);
    console.log(`  removed allocations: ${summary.removed}`);
    for (const l of summary.removedLabels) console.log(`    - ${l}`);
    console.log(`  kept for history (sold > 0): ${summary.keptForHistory}`);
    for (const l of summary.keptLabels) console.log(`    - ${l}`);
    console.log(`  resolved by a rule: ${summary.ruleResolved.length}`);
    for (const l of summary.ruleResolved) console.log(`    - ${l}`);
  } finally {
    await prisma.$disconnect();
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}

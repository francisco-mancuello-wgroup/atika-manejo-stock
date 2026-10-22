import { homedir } from "node:os";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import ExcelJS from "exceljs";
import { createPrismaClient, type Prisma } from "../src/index";
import { cellNumber, cellText, collapse, normalizeLabel } from "./excel/cells";

const USAGE =
  "Usage: GROUP_NAME=<name> GROUP_FILE=<workbook.xlsx> [GROUP_LOT=<lot name>] " +
  "[GROUP_STARTS_AT=<YYYY-MM-DD>] [GROUP_ENDS_AT=<YYYY-MM-DD>] pnpm db:group";

const SHEET = "INVENTARIO";

export interface GroupInput {
  name: string;
  file: string;
  lot?: string;
  startsAt?: Date;
  endsAt?: Date;
}

export interface GroupRow {
  name: string;
  size: string;
  stock: number;
}

export interface GroupSummary {
  matched: number;
  units: number;
  zeroRows: number;
  unmatched: { name: string; size: string }[];
}

function readDate(env: Record<string, string | undefined>, key: string): Date | undefined {
  const raw = env[key]?.trim();
  if (!raw) return undefined;
  const date = new Date(raw.length === 10 ? `${raw}T00:00:00.000Z` : raw);
  if (Number.isNaN(date.getTime())) throw new Error(`${key} is not a valid ISO date: ${raw}`);
  return date;
}

/** Reads the group to seed; the workbook lives outside the repo and is passed by path. */
export function readGroupInput(env: Record<string, string | undefined>): GroupInput {
  const name = env.GROUP_NAME?.trim();
  const file = env.GROUP_FILE?.trim();
  if (!name) throw new Error(`GROUP_NAME is required. ${USAGE}`);
  if (!file) throw new Error(`GROUP_FILE is required. ${USAGE}`);
  const lot = env.GROUP_LOT?.trim();
  return {
    name,
    file: file.startsWith("~/") ? `${homedir()}${file.slice(1)}` : file,
    ...(lot ? { lot } : {}),
    ...(readDate(env, "GROUP_STARTS_AT") ? { startsAt: readDate(env, "GROUP_STARTS_AT") } : {}),
    ...(readDate(env, "GROUP_ENDS_AT") ? { endsAt: readDate(env, "GROUP_ENDS_AT") } : {}),
  };
}

/** Reads the INVENTARIO sheet by header labels, up to TOTALES or the first empty description. */
export function parseGroupSheet(workbook: ExcelJS.Workbook): { title: string; rows: GroupRow[] } {
  const sheet = workbook.getWorksheet(SHEET);
  if (!sheet) throw new Error(`Sheet ${SHEET} not found`);
  const title = cellText(sheet.getRow(1).getCell(1)) ?? "";
  const columns = new Map<string, number>();
  sheet.getRow(2).eachCell((cell, column) => {
    const label = cellText(cell);
    if (label) columns.set(normalizeLabel(label), column);
  });
  const find = (label: string): number => {
    const column = columns.get(label);
    if (!column) throw new Error(`Header ${label} not found in row 2 of ${SHEET}`);
    return column;
  };
  const nameColumn = find("DESCRIPCION");
  const sizeColumn = find("TALLE");
  const stockColumn = find("STOCK ACTUAL");
  const rows: GroupRow[] = [];
  for (let index = 3; index <= sheet.rowCount; index++) {
    const row = sheet.getRow(index);
    const name = cellText(row.getCell(nameColumn));
    if (!name || normalizeLabel(name) === "TOTALES") break;
    const size = cellText(row.getCell(sizeColumn));
    if (!size) continue;
    rows.push({
      name: collapse(name),
      size: collapse(size).toUpperCase(),
      stock: cellNumber(row.getCell(stockColumn)) ?? 0,
    });
  }
  return { title, rows };
}

/** Lot name from the sheet title ("CASA ICONA – INVENTARIO") matched ignoring case and accents. */
export function inferLotName(title: string, lotNames: string[]): string | null {
  const head = normalizeLabel(title.split(/[–—-]/)[0] ?? "");
  if (!head) return null;
  return lotNames.find((name) => normalizeLabel(name) === head) ?? null;
}

/** Units to assign: the sheet stock capped by physical stock, never below what was already sold. */
export function capAllocation(input: {
  stockActual: number;
  variantStock: number;
  sold: number;
}): number {
  return Math.max(input.sold, Math.min(input.stockActual, input.variantStock));
}

/** Upserts the group by name and its allocations; `variant.stock` is never written. */
export async function applyGroup(
  tx: Prisma.TransactionClient,
  input: {
    name: string;
    lotName: string;
    rows: GroupRow[];
    startsAt?: Date | undefined;
    endsAt?: Date | undefined;
  },
): Promise<GroupSummary> {
  const lot = await tx.lot.findFirst({
    where: { name: input.lotName },
    include: { products: { include: { variants: true } } },
  });
  if (!lot) throw new Error(`Lot not found: ${input.lotName}`);
  const variants = new Map<string, { id: string; stock: number }>();
  for (const product of lot.products) {
    for (const variant of product.variants) {
      variants.set(`${normalizeLabel(product.name)}|${variant.size.toUpperCase()}`, variant);
    }
  }
  const window = {
    ...(input.startsAt ? { startsAt: input.startsAt } : {}),
    ...(input.endsAt ? { endsAt: input.endsAt } : {}),
  };
  const existing = await tx.publicationGroup.findFirst({ where: { name: input.name } });
  const group = existing
    ? await tx.publicationGroup.update({ where: { id: existing.id }, data: window })
    : await tx.publicationGroup.create({ data: { name: input.name, ...window } });

  const summary: GroupSummary = { matched: 0, units: 0, zeroRows: 0, unmatched: [] };
  for (const row of input.rows) {
    if (row.stock <= 0) {
      summary.zeroRows += 1;
      continue;
    }
    const variant = variants.get(`${normalizeLabel(row.name)}|${row.size}`);
    if (!variant) {
      summary.unmatched.push({ name: row.name, size: row.size });
      continue;
    }
    const key = { groupId_variantId: { groupId: group.id, variantId: variant.id } };
    const current = await tx.groupAllocation.findUnique({ where: key });
    const allocated = capAllocation({
      stockActual: row.stock,
      variantStock: variant.stock,
      sold: current?.sold ?? 0,
    });
    await tx.groupAllocation.upsert({
      where: key,
      update: { allocated },
      create: { groupId: group.id, variantId: variant.id, allocated },
    });
    summary.matched += 1;
    summary.units += allocated;
  }
  return summary;
}

/** Creates (or refreshes) a publication group from an event workbook's INVENTARIO sheet. */
async function main(): Promise<void> {
  config({ path: fileURLToPath(new URL("../../../.env", import.meta.url)), quiet: true });
  const input = readGroupInput(process.env);
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is required");
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(input.file);
  const { title, rows } = parseGroupSheet(workbook);
  const prisma = createPrismaClient(databaseUrl);
  try {
    let lotName = input.lot;
    if (!lotName) {
      const lots = await prisma.lot.findMany({ select: { name: true } });
      lotName =
        inferLotName(
          title,
          lots.map((lot) => lot.name),
        ) ?? undefined;
      if (!lotName) throw new Error(`Could not infer the lot from "${title}". Set GROUP_LOT.`);
    }
    const resolved = lotName;
    const summary = await prisma.$transaction((tx) =>
      applyGroup(tx, {
        name: input.name,
        lotName: resolved,
        rows,
        startsAt: input.startsAt,
        endsAt: input.endsAt,
      }),
    );
    console.log(`Group "${input.name}" (lot "${resolved}")`);
    console.log(`  matched rows: ${summary.matched}`);
    console.log(`  units allocated: ${summary.units}`);
    console.log(`  skipped zero rows: ${summary.zeroRows}`);
    console.log(`  unmatched rows: ${summary.unmatched.length}`);
    for (const row of summary.unmatched) console.log(`    - ${row.name} (${row.size})`);
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

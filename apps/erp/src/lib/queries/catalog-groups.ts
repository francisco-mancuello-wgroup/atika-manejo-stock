import type { Prisma } from "@atika/db";
import { type GroupStatus, groupStatus } from "../catalog-groups/format";
import { activeGroupWhere, freeInventory, remaining } from "../catalog-groups/stock";
import { toIsoDate } from "../dates";
import { sortSizes } from "../sizes";

/** Any Prisma client or transaction (lets tests read inside a rolled back transaction). */
type Reader = Pick<
  Prisma.TransactionClient,
  "publicationGroup" | "productVariant" | "product" | "lot" | "groupAllocation"
>;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface GroupSummary {
  id: string;
  name: string;
  isActive: boolean;
  /** `yyyy-mm-dd`, or null when the window has no start / end. */
  startsAt: string | null;
  endsAt: string | null;
  status: GroupStatus;
  /** Products with at least one size assigned. */
  productCount: number;
  allocated: number;
  sold: number;
  /** Units still sellable on the web (assigned minus sold, capped by the physical stock). */
  remaining: number;
}

export interface GroupSize {
  variantId: string;
  size: string;
  /** Physical stock. */
  stock: number;
  /** Stock not held by any active group. */
  free: number;
  allocated: number;
  sold: number;
  remaining: number;
}

export interface GroupProduct {
  id: string;
  name: string;
  lotName: string;
  sizes: GroupSize[];
}

export interface GroupDetail {
  id: string;
  name: string;
  isActive: boolean;
  startsAt: string | null;
  endsAt: string | null;
  status: GroupStatus;
  products: GroupProduct[];
  /** What the web would show for this group once it is on. */
  preview: { products: number; units: number };
}

export interface GroupOptions {
  lots: { id: string; name: string }[];
  brands: string[];
}

const isoOrNull = (date: Date | null) => (date ? toIsoDate(date) : null);

export async function getGroupList(db: Reader, now: Date = new Date()): Promise<GroupSummary[]> {
  const groups = await db.publicationGroup.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      allocations: {
        select: {
          allocated: true,
          sold: true,
          variant: { select: { stock: true, productId: true } },
        },
      },
    },
  });
  return groups.map((group) => ({
    id: group.id,
    name: group.name,
    isActive: group.isActive,
    startsAt: isoOrNull(group.startsAt),
    endsAt: isoOrNull(group.endsAt),
    status: groupStatus(group, now),
    productCount: new Set(group.allocations.map((row) => row.variant.productId)).size,
    allocated: group.allocations.reduce((total, row) => total + row.allocated, 0),
    sold: group.allocations.reduce((total, row) => total + row.sold, 0),
    remaining: group.allocations.reduce(
      (total, row) => total + remaining(row.allocated, row.sold, row.variant.stock),
      0,
    ),
  }));
}

/** The group with every size of its products (sizes still unassigned included), or null. */
export async function getGroupDetail(
  db: Reader,
  groupId: string,
  now: Date = new Date(),
): Promise<GroupDetail | null> {
  if (!UUID.test(groupId)) return null;
  const group = await db.publicationGroup.findUnique({
    where: { id: groupId },
    include: { allocations: { select: { variantId: true, allocated: true, sold: true } } },
  });
  if (!group) return null;
  const own = new Map(group.allocations.map((row) => [row.variantId, row]));
  const variants = await db.productVariant.findMany({
    where: { product: { variants: { some: { id: { in: [...own.keys()] } } } } },
    include: {
      product: { select: { id: true, name: true, lot: { select: { name: true } } } },
      allocations: {
        where: { group: activeGroupWhere(now) },
        select: { allocated: true, sold: true },
      },
    },
  });

  const byProduct = new Map<string, GroupProduct>();
  let units = 0;
  for (const variant of variants) {
    const row = own.get(variant.id);
    const allocated = row?.allocated ?? 0;
    const sold = row?.sold ?? 0;
    const left = remaining(allocated, sold, variant.stock);
    units += left;
    const product = byProduct.get(variant.product.id) ?? {
      id: variant.product.id,
      name: variant.product.name,
      lotName: variant.product.lot.name,
      sizes: [],
    };
    product.sizes.push({
      variantId: variant.id,
      size: variant.size,
      stock: variant.stock,
      free: freeInventory(variant.stock, variant.allocations),
      allocated,
      sold,
      remaining: left,
    });
    byProduct.set(variant.product.id, product);
  }
  const products = [...byProduct.values()]
    .map((product) => ({
      ...product,
      sizes: sortSizes(product.sizes.map((size) => size.size)).map(
        (label) => product.sizes.find((size) => size.size === label) as GroupSize,
      ),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "es"));
  const shown = products.filter((product) => product.sizes.some((size) => size.remaining > 0));

  return {
    id: group.id,
    name: group.name,
    isActive: group.isActive,
    startsAt: isoOrNull(group.startsAt),
    endsAt: isoOrNull(group.endsAt),
    status: groupStatus(group, now),
    products,
    preview: { products: shown.length, units },
  };
}

/** Lots and brands the bulk add can pick from. */
export async function getGroupOptions(db: Reader): Promise<GroupOptions> {
  const [lots, brands] = await Promise.all([
    db.lot.findMany({ orderBy: { purchasedAt: "desc" }, select: { id: true, name: true } }),
    db.product.findMany({
      where: { brand: { not: null } },
      distinct: ["brand"],
      orderBy: { brand: "asc" },
      select: { brand: true },
    }),
  ]);
  return {
    lots,
    brands: brands.flatMap((row) => (row.brand ? [row.brand] : [])),
  };
}

/** Name of the active group each of the products sits in (the first one if several). */
export async function getProductGroupNames(
  db: Pick<Prisma.TransactionClient, "groupAllocation">,
  productIds: readonly string[],
  now: Date = new Date(),
): Promise<Map<string, string>> {
  const names = new Map<string, string>();
  if (productIds.length === 0) return names;
  const rows = await db.groupAllocation.findMany({
    where: { variant: { productId: { in: [...productIds] } }, group: activeGroupWhere(now) },
    orderBy: { group: { name: "asc" } },
    select: { variant: { select: { productId: true } }, group: { select: { name: true } } },
  });
  for (const row of rows) {
    if (!names.has(row.variant.productId)) names.set(row.variant.productId, row.group.name);
  }
  return names;
}

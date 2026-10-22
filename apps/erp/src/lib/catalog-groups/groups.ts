import type { Catalog, Prisma } from "@atika/db";
import type { FormState } from "../action-state";
import type { TransactionRunner } from "../lots/save";
import { parseGroup } from "./schema";
import {
  activeGroupWhere,
  type Proposal,
  proposedAllocation,
  remaining,
  validateAllocation,
} from "./stock";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const NOT_FOUND: FormState = { status: "error", message: "No se encontró el grupo." };

function error(message: string): FormState {
  return { status: "error", message };
}

function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

export interface GroupOutcome {
  state: FormState;
  /** Only set when the group was created. */
  groupId?: string;
}

function invalidGroup(raw: Record<string, string>, fieldErrors: Record<string, string>): FormState {
  return { status: "error", message: "Revisá los campos marcados.", fieldErrors, values: raw };
}

export async function createGroup(
  db: TransactionRunner,
  raw: Record<string, string>,
): Promise<GroupOutcome> {
  const parsed = parseGroup(raw);
  if (!parsed.success) return { state: invalidGroup(raw, parsed.fieldErrors) };
  const group = await db.$transaction((tx) => tx.publicationGroup.create({ data: parsed.data }));
  return { groupId: group.id, state: { status: "success", message: "Grupo creado." } };
}

/** Renames the group and changes its window; activation and allocations have their own operations. */
export async function updateGroup(
  db: TransactionRunner,
  groupId: string,
  raw: Record<string, string>,
): Promise<FormState> {
  if (!UUID.test(groupId)) return NOT_FOUND;
  const parsed = parseGroup(raw);
  if (!parsed.success) return invalidGroup(raw, parsed.fieldErrors);
  const result = await db.$transaction((tx) =>
    tx.publicationGroup.updateMany({ where: { id: groupId }, data: parsed.data }),
  );
  return result.count === 0 ? NOT_FOUND : { status: "success", message: "Grupo guardado." };
}

/** Sum of the remainders other groups hold per variant, counting only groups active at `now`. */
async function activeRemainders(
  tx: Pick<Prisma.TransactionClient, "groupAllocation">,
  variantIds: readonly string[],
  now: Date,
  excludeGroupId: string,
): Promise<Map<string, number>> {
  const held = new Map<string, number>();
  if (variantIds.length === 0) return held;
  const rows = await tx.groupAllocation.findMany({
    where: {
      variantId: { in: [...variantIds] },
      groupId: { not: excludeGroupId },
      group: activeGroupWhere(now),
    },
    include: { variant: { select: { stock: true } } },
  });
  for (const row of rows) {
    const total = held.get(row.variantId) ?? 0;
    held.set(row.variantId, total + remaining(row.allocated, row.sold, row.variant.stock));
  }
  return held;
}

export interface AllocationEntry {
  variantId: string;
  allocated: number;
}

type VariantRef = { size: string; product: { name: string } };

function sizeLabel(variant: VariantRef): string {
  return `${variant.product.name}, talle ${variant.size}`;
}

/**
 * Sets the assigned quantity per size (upsert). 0 removes the allocation, unless units were already
 * sold through it: then it stays with `allocated = sold`. All entries are checked before anything is
 * written. The "not more than free stock" limit applies while the group is on; an inactive group is
 * checked again when it is activated.
 */
export async function setGroupAllocations(
  db: TransactionRunner,
  groupId: string,
  entries: readonly AllocationEntry[],
  now: Date = new Date(),
): Promise<FormState> {
  if (!UUID.test(groupId)) return NOT_FOUND;
  if (entries.some((entry) => !Number.isInteger(entry.allocated) || entry.allocated < 0)) {
    return error("Las cantidades tienen que ser números enteros de 0 o más.");
  }
  const byVariant = new Map(entries.map((entry) => [entry.variantId, entry.allocated]));
  const variantIds = [...byVariant.keys()];
  if (variantIds.some((id) => !UUID.test(id))) return error("Ese talle ya no existe.");

  return db.$transaction(async (tx): Promise<FormState> => {
    const group = await tx.publicationGroup.findUnique({ where: { id: groupId } });
    if (!group) return NOT_FOUND;
    const variants = await tx.productVariant.findMany({
      where: { id: { in: variantIds } },
      select: { id: true, size: true, stock: true, product: { select: { name: true } } },
    });
    if (variants.length !== variantIds.length) return error("Ese talle ya no existe.");
    const existing = new Map(
      (
        await tx.groupAllocation.findMany({ where: { groupId, variantId: { in: variantIds } } })
      ).map((row) => [row.variantId, row]),
    );
    const others = await activeRemainders(tx, variantIds, now, groupId);

    const writes: Prisma.PrismaPromise<unknown>[] = [];
    for (const variant of variants) {
      const requested = byVariant.get(variant.id) ?? 0;
      const current = existing.get(variant.id);
      const sold = current?.sold ?? 0;
      if (requested === 0) {
        if (!current) continue;
        writes.push(
          sold > 0
            ? tx.groupAllocation.update({ where: { id: current.id }, data: { allocated: sold } })
            : tx.groupAllocation.delete({ where: { id: current.id } }),
        );
        continue;
      }
      const check = validateAllocation({
        allocated: requested,
        sold,
        stock: variant.stock,
        otherActiveRemainder: others.get(variant.id) ?? 0,
      });
      if (!check.ok && check.reason === "below_sold") {
        return error(
          `${sizeLabel(variant)}: ya vendiste ${check.limit} desde este grupo, no podés asignar menos.`,
        );
      }
      if (!check.ok && group.isActive) {
        return error(`${sizeLabel(variant)}: podés asignar hasta ${check.limit}.`);
      }
      writes.push(
        tx.groupAllocation.upsert({
          where: { groupId_variantId: { groupId, variantId: variant.id } },
          create: { groupId, variantId: variant.id, allocated: requested },
          update: { allocated: requested },
        }),
      );
    }
    await Promise.all(writes);
    return { status: "success", message: "Cantidades guardadas." };
  });
}

export interface ProductFilter {
  productIds?: string[];
  lotId?: string;
  catalog?: Catalog;
  category?: string;
  brand?: string;
}

/**
 * Stock each variant has free for `group`: physical stock minus what the other active groups hold,
 * or nothing when the group is switched on and another switched-on group already has the size.
 */
export async function groupFreeStock(
  tx: Pick<Prisma.TransactionClient, "groupAllocation">,
  group: { id: string; isActive: boolean },
  variants: readonly { id: string; stock: number }[],
  now: Date,
): Promise<Map<string, number>> {
  const ids = variants.map((variant) => variant.id);
  // A switched-on group can't share a size with another switched-on group (see activateGroup).
  const heldElsewhere = group.isActive
    ? new Set(
        (
          await tx.groupAllocation.findMany({
            where: {
              variantId: { in: ids },
              groupId: { not: group.id },
              group: { isActive: true },
            },
          })
        ).map((row) => row.variantId),
      )
    : new Set<string>();
  const others = await activeRemainders(tx, ids, now, group.id);
  return new Map(
    variants.map((variant) => [
      variant.id,
      heldElsewhere.has(variant.id)
        ? 0
        : Math.max(0, variant.stock - (others.get(variant.id) ?? 0)),
    ]),
  );
}

/**
 * One-off snapshot: adds every size of the matching products with the stock that is free right
 * now (stock minus what other active groups hold), as the proposal says: all of it, one unit per
 * size, or none (rows at 0 to adjust later). Sizes without free stock and sizes already in the
 * group are left alone.
 */
export async function addProductsToGroup(
  db: TransactionRunner,
  groupId: string,
  filter: ProductFilter,
  now: Date = new Date(),
  proposal: Proposal = "all",
): Promise<FormState> {
  if (!UUID.test(groupId)) return NOT_FOUND;
  const { productIds, lotId, catalog, category, brand } = filter;
  if (!productIds?.length && !lotId && !catalog && !category && !brand) {
    return error("Elegí un lote, catálogo, categoría o marca.");
  }
  if (lotId && !UUID.test(lotId)) return error("No se encontró el lote.");
  if (productIds?.some((id) => !UUID.test(id))) return error("Ese producto ya no existe.");

  return db.$transaction(async (tx): Promise<FormState> => {
    const group = await tx.publicationGroup.findUnique({ where: { id: groupId } });
    if (!group) return NOT_FOUND;
    const variants = await tx.productVariant.findMany({
      where: {
        stock: { gt: 0 },
        product: {
          ...(productIds?.length ? { id: { in: productIds } } : {}),
          ...(lotId ? { lotId } : {}),
          ...(catalog ? { catalog } : {}),
          ...(category ? { category } : {}),
          ...(brand ? { brand } : {}),
        },
      },
      select: { id: true, stock: true, productId: true },
    });
    const ids = variants.map((variant) => variant.id);
    const inGroup = new Set(
      (await tx.groupAllocation.findMany({ where: { groupId, variantId: { in: ids } } })).map(
        (row) => row.variantId,
      ),
    );
    const free = await groupFreeStock(tx, group, variants, now);
    const data = variants.flatMap((variant) => {
      if (inGroup.has(variant.id)) return [];
      const available = free.get(variant.id) ?? 0;
      return available > 0
        ? [{ groupId, variantId: variant.id, allocated: proposedAllocation(available, proposal) }]
        : [];
    });
    if (data.length === 0) {
      return error("No hay stock libre para asignar en esos productos.");
    }
    await tx.groupAllocation.createMany({ data });
    const products = new Set(
      variants
        .filter((variant) => data.some((row) => row.variantId === variant.id))
        .map((v) => v.productId),
    );
    return {
      status: "success",
      message: `Se agregaron ${plural(data.length, "talle", "talles")} de ${plural(products.size, "producto", "productos")}.`,
    };
  });
}

/**
 * Takes a product out of the group: its sizes go back to the inventory. A size that already sold
 * units through the group stays at `allocated = sold` (see {@link setGroupAllocations}).
 */
export async function removeProductFromGroup(
  db: TransactionRunner,
  groupId: string,
  productId: string,
  now: Date = new Date(),
): Promise<FormState> {
  if (!UUID.test(groupId)) return NOT_FOUND;
  if (!UUID.test(productId)) return error("Ese producto ya no existe.");
  const variants = await db.$transaction((tx) =>
    tx.productVariant.findMany({ where: { productId }, select: { id: true } }),
  );
  const state = await setGroupAllocations(
    db,
    groupId,
    variants.map((variant) => ({ variantId: variant.id, allocated: 0 })),
    now,
  );
  return state.status === "success"
    ? { status: "success", message: "Producto quitado del grupo." }
    : state;
}

/**
 * Switches the group on. A size can only be in one switched-on group, and every allocation has to
 * fit in the stock. It never writes `variant.stock`: the assigned units are just counted as held.
 */
export async function activateGroup(db: TransactionRunner, groupId: string): Promise<FormState> {
  if (!UUID.test(groupId)) return NOT_FOUND;
  return db.$transaction(async (tx): Promise<FormState> => {
    const group = await tx.publicationGroup.findUnique({
      where: { id: groupId },
      include: {
        allocations: {
          include: {
            variant: { select: { size: true, stock: true, product: { select: { name: true } } } },
          },
        },
      },
    });
    if (!group) return NOT_FOUND;
    if (group.allocations.length === 0) {
      return error("Asigná stock a al menos un talle antes de activar el grupo.");
    }
    const clash = await tx.groupAllocation.findFirst({
      where: {
        variantId: { in: group.allocations.map((row) => row.variantId) },
        groupId: { not: groupId },
        group: { isActive: true },
      },
      include: {
        group: { select: { name: true } },
        variant: { select: { size: true, product: { select: { name: true } } } },
      },
    });
    if (clash) {
      return error(`${sizeLabel(clash.variant)} ya está en el grupo activo «${clash.group.name}».`);
    }
    for (const row of group.allocations) {
      // No other switched-on group holds this size (checked above), so only its own limit applies.
      const check = validateAllocation({
        allocated: row.allocated,
        sold: row.sold,
        stock: row.variant.stock,
        otherActiveRemainder: 0,
      });
      if (!check.ok && check.reason === "exceeds_free") {
        return error(
          `${sizeLabel(row.variant)}: solo hay stock para asignar hasta ${check.limit}.`,
        );
      }
    }
    await tx.publicationGroup.update({ where: { id: groupId }, data: { isActive: true } });
    return { status: "success", message: "Grupo activado. Ya se ve en el catálogo." };
  });
}

/** The unsold units go back to the free inventory by themselves: nothing is written to the stock. */
export async function deactivateGroup(db: TransactionRunner, groupId: string): Promise<FormState> {
  if (!UUID.test(groupId)) return NOT_FOUND;
  const result = await db.$transaction((tx) =>
    tx.publicationGroup.updateMany({ where: { id: groupId }, data: { isActive: false } }),
  );
  return result.count === 0
    ? NOT_FOUND
    : {
        status: "success",
        message: "Grupo desactivado. El stock sin vender vuelve al inventario.",
      };
}

/** Only inactive groups can be deleted; their allocations go with them. */
export async function deleteGroup(db: TransactionRunner, groupId: string): Promise<FormState> {
  if (!UUID.test(groupId)) return NOT_FOUND;
  return db.$transaction(async (tx): Promise<FormState> => {
    const group = await tx.publicationGroup.findUnique({ where: { id: groupId } });
    if (!group) return NOT_FOUND;
    if (group.isActive) return error("Desactivá el grupo antes de eliminarlo.");
    await tx.publicationGroup.delete({ where: { id: groupId } });
    return { status: "success", message: "Grupo eliminado." };
  });
}

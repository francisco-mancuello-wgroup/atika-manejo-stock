import "server-only";
import type { Prisma, PrismaClient } from "@atika/db";
import {
  type BankPromoRule,
  type DiscountRule,
  effectiveDiscount,
  groupPromosForDisplay,
  isPromoLive,
  type PromoGroup,
  promosForProduct,
  sortPromosForDisplay,
} from "@atika/pricing";
import { type PublicBankPromo, toPublicPromo } from "./bank-promos";
import type { CatalogFilters } from "./catalog-filters";
import {
  type CatalogProduct,
  type CatalogProductDetail,
  type CatalogSettingsView,
  type PaymentDetailsView,
  toCatalogProduct,
  toCatalogProductDetail,
} from "./catalog-view";
import { CATEGORIES } from "./categories";
import {
  CATALOGS,
  type CatalogSlug,
  type LookbookPage,
  lookbookPages,
  OTHER_BRANDS,
  type PinkOnlySlug,
  pinkOnlySection,
} from "./lookbook";
import {
  type CollectionSummary,
  collectionSlug,
  type PresentationCollection,
  toPresentationPiece,
} from "./presentation";
import { activeGroupWhere, hasActiveGroupStock, toWebVariants, type WebVariant } from "./web-stock";

/** The slice of the Prisma client the catalog reads (a rolled back transaction works too). */
export type CatalogDb = Pick<
  PrismaClient,
  "product" | "catalogSettings" | "discount" | "bankPromo" | "paymentDetails"
>;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The columns the web stock is derived from; `withWebStock` turns them into plain variants. */
function stockSelect(now: Date) {
  return {
    isPublished: true,
    variants: {
      select: {
        size: true,
        stock: true,
        allocations: {
          where: { group: activeGroupWhere(now) },
          select: { allocated: true, sold: true, priceGs: true },
        },
      },
    },
  } satisfies Prisma.ProductSelect;
}

/** Only these columns are ever selected: nothing sensitive is even read from the database. */
const productFields = {
  id: true,
  /** Only to match lot-scoped bank promos; it never reaches a view model. */
  lotId: true,
  name: true,
  brand: true,
  lot: { select: { supplier: { select: { name: true } } } },
  category: true,
  color: true,
  description: true,
  priceGs: true,
  images: {
    select: { url: true, position: true, focusX: true, focusY: true },
    orderBy: { position: "asc" },
    take: 1,
  },
} satisfies Prisma.ProductSelect;

const productSelect = (now: Date) => ({ ...productFields, ...stockSelect(now) });

/** The sheet needs every photo, in order. */
const detailSelect = (now: Date) =>
  ({
    ...productSelect(now),
    images: {
      select: { url: true, position: true, focusX: true, focusY: true },
      orderBy: { position: "asc" },
    },
  }) satisfies Prisma.ProductSelect;

/** The settings that decide which products and sizes are shown. */
export type VisibilitySettings = Pick<
  CatalogSettingsView,
  "showPrices" | "showSoldOutSizes" | "hideOutOfStock"
>;

export const DEFAULT_CATALOG_SETTINGS: CatalogSettingsView = {
  whatsappNumber: "",
  messageTemplate: "Hola! Me interesa {producto} en talle {talle}. ¿Está disponible?",
  heroText: "Prendas seleccionadas, piezas únicas.",
  showPrices: true,
  showSoldOutSizes: false,
  hideOutOfStock: true,
};

/**
 * Active discounts as pricing rules. Nothing is read when prices are hidden, since no price (and
 * so no discount) is shown then.
 */
async function loadDiscountRules(
  db: CatalogDb,
  settings: Pick<CatalogSettingsView, "showPrices">,
): Promise<DiscountRule[]> {
  if (!settings.showPrices) return [];
  const rows = await db.discount.findMany({
    where: { isActive: true },
    select: {
      percent: true,
      isActive: true,
      startsAt: true,
      endsAt: true,
      scope: true,
      products: { select: { productId: true } },
    },
  });
  return rows.map((row) => ({
    percent: row.percent,
    isActive: row.isActive,
    startsAt: row.startsAt,
    endsAt: row.endsAt,
    scope: row.scope,
    productIds: row.products.map((product) => product.productId),
  }));
}

/** Attaches the percent that applies to each product at `now` (highest wins, never stacked). */
function withDiscounts<T extends { id: string }>(
  rows: readonly T[],
  rules: readonly DiscountRule[],
  now: Date,
): (T & { discountPercent: number | null })[] {
  return rows.map((row) => ({ ...row, discountPercent: effectiveDiscount(rules, row.id, now) }));
}

type LiveBankPromo = BankPromoRule & { id: string };

/**
 * Active bank promos as pricing rules (the window and weekday are judged by `isPromoLive`).
 * Nothing is read when prices are hidden: the promos talk about paying for the price.
 */
async function loadBankPromoRules(
  db: CatalogDb,
  settings: Pick<CatalogSettingsView, "showPrices">,
): Promise<LiveBankPromo[]> {
  if (!settings.showPrices) return [];
  const rows = await db.bankPromo.findMany({
    where: { isActive: true },
    select: {
      id: true,
      kind: true,
      value: true,
      days: true,
      capGs: true,
      startsAt: true,
      endsAt: true,
      terms: true,
      isActive: true,
      scope: true,
      banks: { select: { bank: { select: { id: true, name: true, logoUrl: true } } } },
      lots: { select: { lotId: true } },
      products: { select: { productId: true } },
    },
  });
  return rows.map((row) => ({
    id: row.id,
    kind: row.kind,
    value: row.value,
    days: row.days,
    capGs: row.capGs,
    startsAt: row.startsAt,
    endsAt: row.endsAt,
    terms: row.terms,
    isActive: row.isActive,
    scope: row.scope,
    lotIds: row.lots.map((lot) => lot.lotId),
    productIds: row.products.map((product) => product.productId),
    banks: row.banks.map(({ bank }) => bank),
  }));
}

/**
 * Attaches the grouped promos that cover each product today. Products covered by the same promos
 * share one groups array, so the page payload does not repeat it per product.
 */
function withBankPromos<T extends { id: string; lotId: string }>(
  rows: readonly T[],
  rules: readonly LiveBankPromo[],
  now: Date,
): (T & { bankPromos: PromoGroup[] })[] {
  const shared = new Map<string, PromoGroup[]>();
  return rows.map((row) => {
    const covering = promosForProduct(rules, { productId: row.id, lotId: row.lotId }, now);
    const key = covering
      .map((promo) => promo.id)
      .sort()
      .join(",");
    let groups = shared.get(key);
    if (!groups) {
      groups = groupPromosForDisplay(covering);
      shared.set(key, groups);
    }
    return { ...row, bankPromos: groups };
  });
}

/** Every live bank promo, for the "bases y condiciones" page; nothing while prices are hidden. */
export async function listPublicBankPromos(
  db: CatalogDb,
  settings: Pick<CatalogSettingsView, "showPrices">,
  now: Date = new Date(),
): Promise<PublicBankPromo[]> {
  const rules = await loadBankPromoRules(db, settings);
  return sortPromosForDisplay(rules.filter((rule) => isPromoLive(rule, now))).map(toPublicPromo);
}

export async function getCatalogSettings(db: CatalogDb): Promise<CatalogSettingsView> {
  const row = await db.catalogSettings.findUnique({ where: { id: 1 } });
  if (!row) return DEFAULT_CATALOG_SETTINGS;
  return {
    whatsappNumber: row.whatsappNumber,
    messageTemplate: row.messageTemplate,
    heroText: row.heroText,
    showPrices: row.showPrices,
    showSoldOutSizes: row.showSoldOutSizes,
    hideOutOfStock: row.hideOutOfStock,
  };
}

/** The bank details for /datos-bancarios, or null when the ERP has not loaded them yet. */
export async function getPaymentDetails(db: CatalogDb): Promise<PaymentDetailsView | null> {
  return db.paymentDetails.findUnique({
    where: { id: 1 },
    select: { holderName: true, bank: true, accountGs: true, accountUsd: true, ruc: true },
  });
}

type ListFilters = Pick<CatalogFilters, "talle" | "q" | "orden">;

const NO_FILTERS: ListFilters = { talle: null, q: null, orden: "recientes" };

/**
 * Rows that can be on the web: published, or holding units in an active group. The remainder
 * (`allocated - sold > 0`) compares two columns, which Prisma can't express, so the database only
 * narrows (physical stock is an upper bound of web stock) and `withWebStock` decides in memory.
 */
function visibleWhere(
  settings: VisibilitySettings,
  now: Date,
  filters: Pick<ListFilters, "talle" | "q"> = NO_FILTERS,
): Prisma.ProductWhereInput {
  const and: Prisma.ProductWhereInput[] = [
    {
      OR: [
        { isPublished: true },
        { variants: { some: { allocations: { some: { group: activeGroupWhere(now) } } } } },
      ],
    },
  ];
  if (settings.hideOutOfStock) and.push({ variants: { some: { stock: { gt: 0 } } } });
  // A size filter means "can be bought in that size".
  if (filters.talle) {
    and.push({ variants: { some: { size: filters.talle, stock: { gt: 0 } } } });
  }
  if (filters.q) {
    const contains = { contains: filters.q, mode: "insensitive" as const };
    and.push({
      OR: [{ name: contains }, { brand: contains }, { lot: { supplier: { name: contains } } }],
    });
  }
  return { AND: and };
}

interface StockRow {
  isPublished: boolean;
  variants: readonly WebVariant[];
}

/**
 * Applies the web stock: every variant's `stock` becomes what the web can sell, and rows that
 * aren't visible drop out. Unpublished rows need units left in an active group; `hideOutOfStock`
 * and the size filter are judged on web stock, so they match what the pages then show.
 */
function withWebStock<T extends StockRow>(
  rows: readonly T[],
  settings: Pick<VisibilitySettings, "hideOutOfStock">,
  filters: Pick<ListFilters, "talle"> = { talle: null },
): (Omit<T, "isPublished" | "variants"> & { variants: { size: string; stock: number }[] })[] {
  return rows.flatMap(({ isPublished, variants, ...rest }) => {
    if (!isPublished && !hasActiveGroupStock(variants)) return [];
    const web = toWebVariants(variants, isPublished);
    if (settings.hideOutOfStock && !web.some((variant) => variant.stock > 0)) return [];
    if (filters.talle && !web.some((v) => v.size === filters.talle && v.stock > 0)) return [];
    return [{ ...rest, variants: web }];
  });
}

function orderBy(settings: VisibilitySettings, orden: ListFilters["orden"]) {
  const newest = [{ createdAt: "desc" as const }, { id: "desc" as const }];
  // With hidden prices a price sort would leak the order, so it is ignored.
  if (!settings.showPrices || orden === "recientes") return newest;
  return [{ priceGs: orden === "precio-asc" ? ("asc" as const) : ("desc" as const) }, ...newest];
}

/** Products on the web (published or in an active group). `category` null lists all ("novedades"). */
export async function listProducts(
  db: CatalogDb,
  settings: VisibilitySettings,
  category: string | null,
  filters: ListFilters = NO_FILTERS,
  now: Date = new Date(),
): Promise<CatalogProduct[]> {
  const rows = await db.product.findMany({
    where: { ...visibleWhere(settings, now, filters), ...(category ? { category } : {}) },
    orderBy: orderBy(settings, filters.orden),
    select: productSelect(now),
  });
  const rules = await loadDiscountRules(db, settings);
  return withDiscounts(withWebStock(rows, settings, filters), rules, now).map((row) =>
    toCatalogProduct(row, settings),
  );
}

/**
 * Products per category slug for the rail, plus `novedades` (every visible product). Size and
 * search filters apply, so the numbers match what each link would list.
 */
export async function countProductsByCategory(
  db: CatalogDb,
  settings: VisibilitySettings,
  filters: Pick<ListFilters, "talle" | "q"> = NO_FILTERS,
  now: Date = new Date(),
): Promise<Record<string, number>> {
  // Counted in memory over the same rows `listProducts` reads, so numbers and lists always agree.
  const rows = await db.product.findMany({
    where: visibleWhere(settings, now, filters),
    select: { category: true, ...stockSelect(now) },
  });
  const counts: Record<string, number> = Object.fromEntries(
    CATEGORIES.map((category) => [category.slug, 0]),
  );
  for (const row of withWebStock(rows, settings, filters)) {
    counts.novedades = (counts.novedades ?? 0) + 1;
    if (row.category && row.category in counts)
      counts[row.category] = (counts[row.category] ?? 0) + 1;
  }
  return counts;
}

/** One product on the web, or null (unknown id, not published nor in a group, or out of stock). */
export async function getProduct(
  db: CatalogDb,
  settings: VisibilitySettings,
  id: string,
  now: Date = new Date(),
): Promise<CatalogProduct | null> {
  if (!UUID.test(id)) return null;
  const row = await db.product.findFirst({
    where: { id, ...visibleWhere(settings, now) },
    select: productSelect(now),
  });
  const [shown] = row ? withWebStock([row], settings) : [];
  if (!shown) return null;
  const [discounted] = withDiscounts([shown], await loadDiscountRules(db, settings), now);
  return discounted ? toCatalogProduct(discounted, settings) : null;
}

/** Same visibility rules as `getProduct`, with every photo, color and description. */
export async function getProductDetail(
  db: CatalogDb,
  settings: VisibilitySettings,
  id: string,
  now: Date = new Date(),
): Promise<CatalogProductDetail | null> {
  if (!UUID.test(id)) return null;
  const row = await db.product.findFirst({
    where: { id, ...visibleWhere(settings, now) },
    select: detailSelect(now),
  });
  const [shown] = row ? withWebStock([row], settings) : [];
  if (!shown) return null;
  const [discounted] = withDiscounts([shown], await loadDiscountRules(db, settings), now);
  if (!discounted) return null;
  const [withPromos] = withBankPromos([discounted], await loadBankPromoRules(db, settings), now);
  return withPromos ? toCatalogProductDetail(withPromos, settings) : null;
}

/**
 * Presentation order: the order the supplier sheets were imported (oldest row first), so a
 * collection reads like its catalog. The rows list stays newest first.
 */
const importOrder = [{ createdAt: "asc" as const }, { id: "asc" as const }];

/** One collection per supplier with visible products, in order of first appearance. */
export async function listCollections(
  db: CatalogDb,
  settings: VisibilitySettings,
  now: Date = new Date(),
): Promise<CollectionSummary[]> {
  const rows = await db.product.findMany({
    where: visibleWhere(settings, now),
    orderBy: importOrder,
    select: {
      lot: { select: { supplier: { select: { name: true } } } },
      images: { select: { url: true }, orderBy: { position: "asc" }, take: 1 },
      ...stockSelect(now),
    },
  });
  const collections = new Map<string, CollectionSummary>();
  for (const row of withWebStock(rows, settings)) {
    const name = row.lot.supplier.name.trim();
    const slug = collectionSlug(name);
    const found = collections.get(slug) ?? { slug, name, count: 0, coverUrl: null };
    found.count += 1;
    found.coverUrl ??= row.images[0]?.url ?? null;
    collections.set(slug, found);
  }
  return [...collections.values()];
}

/** Every visible piece of a collection with all its photos, or null for an unknown slug. */
export async function getCollectionPresentation(
  db: CatalogDb,
  settings: VisibilitySettings,
  slug: string,
  now: Date = new Date(),
): Promise<PresentationCollection | null> {
  const collection = (await listCollections(db, settings, now)).find((item) => item.slug === slug);
  if (!collection) return null;
  const rows = await db.product.findMany({
    where: { ...visibleWhere(settings, now), lot: { supplier: { name: collection.name } } },
    orderBy: importOrder,
    select: detailSelect(now),
  });
  return {
    slug,
    name: collection.name,
    pieces: withDiscounts(
      withWebStock(rows, settings),
      await loadDiscountRules(db, settings),
      now,
    ).map((row) => toPresentationPiece(row, settings)),
  };
}

const lookbookSelect = (now: Date) =>
  ({
    ...detailSelect(now),
    catalog: true,
    catalogOrder: true,
    catalogSection: true,
  }) satisfies Prisma.ProductSelect;

/** Lookbook rows matching `where`, with web stock, discounts, bank promos and their Pink fields. */
async function readLookbookRows(
  db: CatalogDb,
  settings: Pick<CatalogSettingsView, "showPrices">,
  now: Date,
  where: Prisma.ProductWhereInput,
) {
  const rows = await db.product.findMany({
    where,
    orderBy: [{ catalogOrder: "asc" }, { id: "asc" }],
    select: lookbookSelect(now),
  });
  // The Pink event is whatever sits in an active group; read before the stock rewrite drops it.
  const flagged = rows.map((row) => {
    const allocations = row.variants.flatMap((variant) => variant.allocations);
    return {
      ...row,
      inGroup: allocations.length > 0,
      pinkPriceGs: allocations.find((allocation) => allocation.priceGs != null)?.priceGs ?? null,
    };
  });
  return withBankPromos(
    withDiscounts(
      withWebStock(flagged, { hideOutOfStock: false }),
      await loadDiscountRules(db, settings),
      now,
    ),
    await loadBankPromoRules(db, settings),
    now,
  );
}

const inActiveGroup = (now: Date): Prisma.ProductWhereInput => ({
  variants: { some: { allocations: { some: { group: activeGroupWhere(now) } } } },
});

/**
 * The pages of every lookbook catalog (Casa Icona, Milonga, Sordo), in display order. Only
 * products on the web (published or in an active group) placed in a catalog are read; pieces
 * without stock or photos drop out in `lookbookPages`.
 */
export async function listLookbook(
  db: CatalogDb,
  settings: Pick<CatalogSettingsView, "showPrices">,
  now: Date = new Date(),
): Promise<Record<CatalogSlug, LookbookPage[]>> {
  const rows = await readLookbookRows(db, settings, now, {
    catalog: { not: null },
    OR: [{ isPublished: true }, inActiveGroup(now)],
  });
  const byCatalog = Object.fromEntries(
    CATALOGS.map(({ slug, value }) => [
      slug,
      lookbookPages(
        rows.filter((row) => row.catalog === value),
        settings,
      ),
    ]),
  );
  return byCatalog as Record<CatalogSlug, LookbookPage[]>;
}

/**
 * Pink pieces placed in no catalog: they show on Pink only, after the catalog of their brand or
 * under Otras marcas (`pinkOnlySection`).
 */
export async function listPinkOnly(
  db: CatalogDb,
  settings: Pick<CatalogSettingsView, "showPrices">,
  now: Date = new Date(),
): Promise<Record<PinkOnlySlug, LookbookPage[]>> {
  const rows = await readLookbookRows(db, settings, now, { catalog: null, ...inActiveGroup(now) });
  const slugs: PinkOnlySlug[] = [...CATALOGS.map((catalog) => catalog.slug), OTHER_BRANDS.slug];
  return Object.fromEntries(
    slugs.map((slug) => [
      slug,
      lookbookPages(
        rows.filter((row) => pinkOnlySection(row) === slug),
        settings,
      ),
    ]),
  ) as Record<PinkOnlySlug, LookbookPage[]>;
}

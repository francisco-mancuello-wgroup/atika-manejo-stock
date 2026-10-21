import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { Presentation } from "../../../components/presentation";
import { getDb } from "../../../lib/db";
import { getCatalogSettings, getCollectionPresentation } from "../../../lib/queries";

type Params = Promise<{ slug: string }>;

// Products and settings change from the ERP at any time.
export const dynamic = "force-dynamic";

/** Shared by the metadata and the page of one request. */
const loadCollection = cache(async (slug: string) => {
  const db = getDb();
  return getCollectionPresentation(db, await getCatalogSettings(db), slug);
});

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const collection = await loadCollection((await params).slug);
  return { title: collection ? `${collection.name} · atika` : "atika" };
}

export default async function PresentationPage({ params }: { params: Params }) {
  const collection = await loadCollection((await params).slug);
  if (!collection) notFound();
  return <Presentation collection={collection} />;
}

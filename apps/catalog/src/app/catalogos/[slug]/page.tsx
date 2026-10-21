import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { cache } from "react";
import { Presentation } from "../../../components/presentation";
import { getDb } from "../../../lib/db";
import { getCatalogSettings, getCollectionPresentation } from "../../../lib/queries";
import { requestOrigin } from "../../../lib/whatsapp";

type Params = Promise<{ slug: string }>;

// Products and settings change from the ERP at any time.
export const dynamic = "force-dynamic";

/** Shared by the metadata and the page of one request. */
const loadCollection = cache(async (slug: string) => {
  const db = getDb();
  const settings = await getCatalogSettings(db);
  return { settings, collection: await getCollectionPresentation(db, settings, slug) };
});

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { collection } = await loadCollection((await params).slug);
  return { title: collection ? `${collection.name} · atika` : "atika" };
}

export default async function PresentationPage({ params }: { params: Params }) {
  const { settings, collection } = await loadCollection((await params).slug);
  if (!collection) notFound();
  const requestHeaders = await headers();
  return (
    <Presentation
      collection={collection}
      whatsappNumber={settings.whatsappNumber}
      messageTemplate={settings.messageTemplate}
      origin={requestOrigin((name) => requestHeaders.get(name))}
    />
  );
}

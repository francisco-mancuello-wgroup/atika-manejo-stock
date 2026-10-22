import { redirect } from "next/navigation";
import { workspaceHref } from "../../../../../lib/bank-promos/workspace";

/** Editing a promo happens in the master-detail screen now. */
export default async function EditBankPromoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<never> {
  const { id } = await params;
  redirect(workspaceHref({ tab: "promos", id }));
}

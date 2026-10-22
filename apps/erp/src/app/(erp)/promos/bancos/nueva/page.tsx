import { redirect } from "next/navigation";
import { workspaceHref } from "../../../../../lib/bank-promos/workspace";

/** The new promo form lives in the master-detail screen now. */
export default function NewBankPromoPage(): never {
  redirect(workspaceHref({ tab: "promos", isNew: true }));
}

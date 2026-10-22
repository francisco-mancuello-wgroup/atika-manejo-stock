import { redirect } from "next/navigation";

/** Promos has no page of its own: it opens on Descuentos. */
export default function PromosPage() {
  redirect("/promos/descuentos");
}

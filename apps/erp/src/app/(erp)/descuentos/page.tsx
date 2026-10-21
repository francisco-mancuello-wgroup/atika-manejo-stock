import { DiscountsView } from "../../../components/discounts-view";
import { getDb } from "../../../lib/db";
import { getDiscountList } from "../../../lib/queries/discounts";
import { deleteDiscountAction, setDiscountActiveAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function DescuentosPage() {
  const discounts = await getDiscountList(getDb());
  return (
    <DiscountsView
      discounts={discounts}
      actions={{ setActive: setDiscountActiveAction, remove: deleteDiscountAction }}
    />
  );
}

import type { PromoGroup } from "@atika/pricing";
import { render, screen, within } from "@testing-library/react";
import { BankPromosBlock } from "./bank-promos-block";

const groups: PromoGroup[] = [
  {
    headline: "Hasta 12 cuotas sin intereses",
    kind: "installments",
    value: 12,
    banks: [
      { id: "b1", name: "Itaú", logoUrl: "/media/banks/uploads/b1/a.webp" },
      { id: "b2", name: "Continental", logoUrl: null },
    ],
  },
  {
    headline: "20 % de reintegro · Jueves",
    kind: "refund",
    value: 20,
    banks: [{ id: "b1", name: "Itaú", logoUrl: "/media/banks/uploads/b1/a.webp" }],
  },
];

describe("BankPromosBlock", () => {
  it("renders nothing when no promo applies", () => {
    const { container } = render(<BankPromosBlock groups={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows each headline with its bank logos, or the name when a bank has no logo", () => {
    render(<BankPromosBlock groups={groups} />);
    const region = screen.getByRole("region", { name: "Nuestras promociones bancarias" });
    const items = within(region).getAllByRole("listitem");
    expect(items).toHaveLength(2);
    expect(
      within(items[0] as HTMLElement).getByText("Hasta 12 cuotas sin intereses"),
    ).toBeVisible();
    expect(within(items[0] as HTMLElement).getByRole("img", { name: "Itaú" })).toBeInTheDocument();
    expect(within(items[0] as HTMLElement).getByText("Continental")).toBeInTheDocument();
    expect(within(items[1] as HTMLElement).getByText("20 % de reintegro · Jueves")).toBeVisible();
  });

  it("links to the terms and conditions page", () => {
    render(<BankPromosBlock groups={groups} />);
    expect(screen.getByRole("link", { name: "Ver bases y condiciones" })).toHaveAttribute(
      "href",
      "/promociones-bancarias",
    );
  });
});

import { render, screen, within } from "@testing-library/react";
import type { OrderDetail } from "../lib/queries/orders";
import { OrderDetailView } from "./order-detail-view";

const order: OrderDetail = {
  id: "o1",
  number: 42,
  date: "2026-10-22",
  status: "pending",
  decidedDate: null,
  totalGs: 280_000,
  items: [
    {
      id: "i1",
      productId: "p1",
      productName: "Blusa A",
      size: "M",
      color: "Rojo",
      quantity: 2,
      unitPriceGs: 90_000,
      discountPercent: 10,
      subtotalGs: 180_000,
      stock: 3,
    },
    {
      id: "i2",
      productId: "p2",
      productName: "Saco B",
      size: "U",
      color: null,
      quantity: 1,
      unitPriceGs: 100_000,
      discountPercent: null,
      subtotalGs: 100_000,
      stock: 0,
    },
  ],
};

describe("OrderDetailView", () => {
  it("shows the order number, status, date and a link back to the list", () => {
    render(<OrderDetailView order={order} />);
    expect(screen.getByRole("heading", { level: 1, name: "Pedido #0042" })).toBeInTheDocument();
    expect(screen.getByText("Pendiente")).toBeInTheDocument();
    expect(screen.getByText(/22\/10\/2026/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "← Pedidos" })).toHaveAttribute(
      "href",
      "/ventas/pedidos",
    );
  });

  it("lists each line with piece, size, colour, quantity, price, subtotal and current stock", () => {
    render(<OrderDetailView order={order} />);
    // Without the header row and the total row.
    const rows = screen.getAllByRole("row").slice(1, -1);
    expect(rows).toHaveLength(2);
    const first = within(rows[0] as HTMLElement);
    expect(first.getByRole("link", { name: "Blusa A" })).toHaveAttribute("href", "/inventario/p1");
    expect(first.getByText("M")).toBeInTheDocument();
    expect(first.getByText("Rojo")).toBeInTheDocument();
    expect(first.getByText("2")).toBeInTheDocument();
    expect(first.getByText("₲ 90.000")).toBeInTheDocument();
    expect(first.getByText("-10 %")).toBeInTheDocument();
    expect(first.getByText("₲ 180.000")).toBeInTheDocument();
    expect(first.getByText("3")).toBeInTheDocument();
    expect(within(rows[1] as HTMLElement).getByText("–")).toBeInTheDocument();
    expect(screen.getByText("Total")).toBeInTheDocument();
    expect(screen.getByText("₲ 280.000")).toBeInTheDocument();
  });

  it("flags a line asking for more than the stock left", () => {
    render(<OrderDetailView order={order} />);
    expect(screen.getAllByText("Sin stock suficiente")).toHaveLength(1);
    expect(screen.getByText("Sin stock suficiente").closest("tr")).toHaveTextContent("Saco B");
  });

  it("shows when a decided order was decided", () => {
    render(<OrderDetailView order={{ ...order, status: "approved", decidedDate: "2026-10-23" }} />);
    expect(screen.getByText("Aprobado")).toBeInTheDocument();
    expect(screen.getByText(/23\/10\/2026/)).toBeInTheDocument();
  });
});

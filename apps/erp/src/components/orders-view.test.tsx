import { render, screen, within } from "@testing-library/react";
import type { OrderSummary } from "../lib/queries/orders";
import { OrdersView } from "./orders-view";

const orders: OrderSummary[] = [
  { id: "o2", number: 42, date: "2026-10-22", status: "pending", lineCount: 2, totalGs: 480_000 },
  { id: "o1", number: 41, date: "2026-10-20", status: "approved", lineCount: 1, totalGs: 100_000 },
];

describe("OrdersView", () => {
  it("lists the orders in the given order with number, date, lines, total and status", () => {
    render(<OrdersView orders={orders} />);
    expect(screen.getByRole("heading", { level: 1, name: "Pedidos" })).toBeInTheDocument();
    const rows = screen.getAllByRole("row").slice(1);
    expect(rows).toHaveLength(2);
    const first = within(rows[0] as HTMLElement);
    expect(first.getByRole("link", { name: "#0042" })).toHaveAttribute(
      "href",
      "/ventas/pedidos/o2",
    );
    expect(first.getByText("22/10/2026")).toBeInTheDocument();
    expect(first.getByText("2")).toBeInTheDocument();
    expect(first.getByText("₲ 480.000")).toBeInTheDocument();
    expect(first.getByText("Pendiente")).toBeInTheDocument();
    expect(within(rows[1] as HTMLElement).getByText("Aprobado")).toBeInTheDocument();
  });

  it("filters by status with links and marks the chosen one", () => {
    render(<OrdersView orders={orders} status="approved" />);
    expect(screen.getByRole("link", { name: "Todos" })).toHaveAttribute("href", "/ventas/pedidos");
    expect(screen.getByRole("link", { name: "Pendientes" })).toHaveAttribute(
      "href",
      "/ventas/pedidos?estado=pending",
    );
    expect(screen.getByRole("link", { name: "Rechazados" })).toHaveAttribute(
      "href",
      "/ventas/pedidos?estado=rejected",
    );
    expect(screen.getByRole("link", { name: "Aprobados" })).toHaveAttribute("aria-current", "true");
    expect(screen.getByRole("link", { name: "Todos" })).not.toHaveAttribute("aria-current");
  });

  it("says so when there are no orders", () => {
    render(<OrdersView orders={[]} />);
    expect(screen.getByText("Todavía no hay pedidos.")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("says so when the filter matches nothing", () => {
    render(<OrdersView orders={[]} status="rejected" />);
    expect(screen.getByText("No hay pedidos rechazados.")).toBeInTheDocument();
  });
});

import { render, screen } from "@testing-library/react";
import {
  DashboardSkeleton,
  DetailSkeleton,
  FormSkeleton,
  TableSkeleton,
} from "./loading-skeletons";

const compositions = [
  ["TableSkeleton", <TableSkeleton key="table" />],
  ["DetailSkeleton", <DetailSkeleton key="detail" />],
  ["FormSkeleton", <FormSkeleton key="form" />],
  ["DashboardSkeleton", <DashboardSkeleton key="dashboard" />],
] as const;

describe.each(compositions)("%s", (_name, element) => {
  it("announces a single busy loading region with a Spanish label", () => {
    render(element);
    const region = screen.getByRole("status");
    expect(region).toHaveAttribute("aria-busy", "true");
    expect(region).toHaveTextContent("Cargando…");
  });

  it("renders placeholder blocks that do not animate under reduced motion", () => {
    const { container } = render(element);
    const blocks = container.querySelectorAll("[data-skeleton]");
    expect(blocks.length).toBeGreaterThan(0);
    for (const block of blocks) expect(block).toHaveClass("motion-reduce:animate-none");
  });
});

describe("TableSkeleton", () => {
  it("renders the requested number of columns and rows", () => {
    render(<TableSkeleton columns={3} rows={4} />);
    expect(screen.getAllByRole("columnheader")).toHaveLength(3);
    expect(screen.getAllByRole("row")).toHaveLength(5);
  });

  it("only shows the filter bar when asked", () => {
    const { container, rerender } = render(<TableSkeleton />);
    const withoutFilters = container.querySelectorAll("[data-skeleton]").length;
    rerender(<TableSkeleton filters />);
    expect(container.querySelectorAll("[data-skeleton]").length).toBe(withoutFilters + 3);
  });
});

describe("FormSkeleton", () => {
  it("renders one placeholder per field plus the submit button", () => {
    const { container } = render(<FormSkeleton fields={3} />);
    // header: 2, per field: 2, button: 1
    expect(container.querySelectorAll("[data-skeleton]")).toHaveLength(2 + 3 * 2 + 1);
  });
});

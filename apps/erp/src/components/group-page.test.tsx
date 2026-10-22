import { render, screen } from "@testing-library/react";
import { vi } from "vitest";
import type { FormState } from "../lib/action-state";
import type { GroupDetail } from "../lib/queries/catalog-groups";
import { GroupPage } from "./group-page";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }) }));

const ok = async (): Promise<FormState> => ({ status: "success", message: "ok" });
const actions = {
  saveGroup: vi.fn(async (_id: string | null, _p: FormState, _d: FormData) => ok()),
  saveAllocations: vi.fn(ok),
  addProducts: vi.fn(ok),
  removeProduct: vi.fn(ok),
  deleteGroup: vi.fn(ok),
};
const detail: GroupDetail = {
  id: "g2",
  name: "Liquidación",
  isActive: false,
  startsAt: null,
  endsAt: null,
  status: "Inactivo",
  products: [],
  preview: { products: 0, units: 0 },
};

function renderPage(group: GroupDetail | null) {
  render(
    <GroupPage detail={group} options={{ lots: [], brands: [] }} products={[]} actions={actions} />,
  );
}

describe("GroupPage", () => {
  it("titles the page with the group name and links back to the groups tab", () => {
    renderPage(detail);
    expect(screen.getByRole("heading", { level: 1, name: "Liquidación" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "← Grupos" })).toHaveAttribute(
      "href",
      "/catalogo-web?tab=grupos",
    );
    expect(screen.getByLabelText("Nombre")).toHaveValue("Liquidación");
  });

  it("is a new group form without a group", () => {
    renderPage(null);
    expect(screen.getByRole("heading", { level: 1, name: "Nuevo grupo" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Crear grupo" })).toBeInTheDocument();
  });
});

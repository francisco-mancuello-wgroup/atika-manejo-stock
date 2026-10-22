import { render, screen } from "@testing-library/react";
import { vi } from "vitest";
import type { FormState } from "../lib/action-state";
import type { GroupStatus } from "../lib/catalog-groups/format";
import type { GroupDetail } from "../lib/queries/catalog-groups";
import { GroupPage } from "./group-page";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }) }));

const ok = async (): Promise<FormState> => ({ status: "success", message: "ok" });
const actions = {
  saveGroup: vi.fn(async (_id: string | null, _p: FormState, _d: FormData) => ok()),
  saveAllocations: vi.fn(ok),
  removeProduct: vi.fn(ok),
  deleteGroup: vi.fn(ok),
  setActive: vi.fn(ok),
};
const detail: GroupDetail = {
  id: "g2",
  name: "Liquidación",
  isActive: false,
  startsAt: "2026-11-01",
  endsAt: "2026-11-30",
  status: "Inactivo",
  products: [],
  preview: { products: 0, units: 0 },
};

function renderPage(group: GroupDetail | null) {
  render(<GroupPage detail={group} actions={actions} />);
}

describe("GroupPage", () => {
  it("titles the page with the group name and a breadcrumb back to the groups", () => {
    renderPage(detail);
    expect(screen.getByRole("heading", { level: 1, name: "Liquidación" })).toBeInTheDocument();
    const trail = screen.getByRole("navigation", { name: "Ruta" });
    expect(screen.getByRole("link", { name: "Catálogo web" })).toHaveAttribute(
      "href",
      "/catalogo-web",
    );
    expect(screen.getByRole("link", { name: "Grupos" })).toHaveAttribute(
      "href",
      "/catalogo-web?tab=grupos",
    );
    expect(trail).toHaveTextContent("Liquidación");
    expect(screen.queryByRole("link", { name: "← Grupos" })).not.toBeInTheDocument();
  });

  it("shows the window under the title", () => {
    renderPage(detail);
    expect(screen.getByText("01/11 – 30/11")).toBeInTheDocument();
    renderPage({ ...detail, startsAt: null, endsAt: null });
    expect(screen.getByText("Sin fecha")).toBeInTheDocument();
  });

  it.each<[GroupStatus, boolean, string]>([
    ["Activo", true, "En la web"],
    ["Programado", true, "Programado · desde 01/11"],
    ["Vencido", true, "Vencido"],
    ["Inactivo", false, "No publicado"],
  ])("shows %s as %s", (status, isActive, label) => {
    renderPage({ ...detail, status, isActive });
    expect(screen.getByText(label)).toBeInTheDocument();
  });

  it("has the publish switch", () => {
    renderPage({ ...detail, isActive: true, status: "Activo" });
    expect(screen.getByRole("switch", { name: "Activo: Liquidación" })).toBeChecked();
  });

  it("has the group data card, the counting help and the delete zone", () => {
    renderPage(detail);
    expect(screen.getByText("DATOS DEL GRUPO")).toBeInTheDocument();
    expect(screen.getByLabelText("Nombre")).toHaveValue("Liquidación");
    expect(screen.getByLabelText("Desde")).toHaveValue("2026-11-01");
    expect(screen.getByText("Sin fechas, se ve mientras esté publicado.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Guardar datos" })).toBeInTheDocument();
    expect(screen.getByText("CÓMO SE CUENTA")).toBeInTheDocument();
    expect(screen.getByText("Asignado − vendido, nunca más que el físico")).toBeInTheDocument();
    expect(screen.getByText("ZONA DE RIESGO")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Eliminar: Liquidación" })).toBeEnabled();
  });

  it("disables delete while the group is published", () => {
    renderPage({ ...detail, isActive: true, status: "Activo" });
    expect(screen.getByRole("button", { name: "Eliminar: Liquidación" })).toBeDisabled();
    expect(screen.getByText("Despublicá el grupo para poder eliminarlo.")).toBeInTheDocument();
  });

  it("is only the data card without a group", () => {
    renderPage(null);
    expect(screen.getByRole("heading", { level: 1, name: "Nuevo grupo" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Crear grupo" })).toBeInTheDocument();
    expect(screen.queryByText("ZONA DE RIESGO")).not.toBeInTheDocument();
    expect(screen.queryByRole("switch")).not.toBeInTheDocument();
  });
});

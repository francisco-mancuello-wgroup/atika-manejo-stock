import { render, screen } from "@testing-library/react";
import type { ComponentType } from "react";
import CatalogoWebPage from "./catalogo-web/page";
import ComprasPage from "./compras/page";
import InventarioPage from "./inventario/page";
import NotFound from "./not-found";
import ParametrosPage from "./parametros/page";
import VentasPage from "./ventas/page";

describe.each<[string, ComponentType]>([
  ["Inventario", InventarioPage],
  ["Compras", ComprasPage],
  ["Ventas", VentasPage],
  ["Catálogo web", CatalogoWebPage],
  ["Parámetros", ParametrosPage],
])("ERP section %s", (title, Page) => {
  it("renders its heading and tells that it is under construction", () => {
    render(<Page />);
    expect(screen.getByRole("heading", { level: 1, name: title })).toBeInTheDocument();
    expect(screen.getByText("Esta sección está en construcción.")).toBeInTheDocument();
  });
});

describe("ERP not found page", () => {
  it("explains the page does not exist and links back to Resumen", () => {
    render(<NotFound />);
    expect(
      screen.getByRole("heading", { level: 1, name: "Página no encontrada" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Volver al resumen" })).toHaveAttribute("href", "/");
  });
});

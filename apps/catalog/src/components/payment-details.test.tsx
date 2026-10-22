import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PaymentDetails } from "./payment-details";

const details = {
  holderName: "SZUT EAS",
  bank: "Basa",
  accountGs: "2155009507",
  accountUsd: "12155002091",
  ruc: "80132068-2",
};

function mockClipboard() {
  const writeText = vi.fn(async () => {});
  Object.assign(navigator, { clipboard: { writeText } });
  return writeText;
}

describe("PaymentDetails", () => {
  it("lists every bank detail with its label, like the printed card", () => {
    render(<PaymentDetails details={details} />);
    expect(screen.getByRole("heading", { name: "Datos Bancarios" })).toBeInTheDocument();
    const rows = screen.getAllByRole("listitem").map((row) => row.textContent);
    expect(rows).toEqual([
      expect.stringContaining("Razón Social:SZUT EAS"),
      expect.stringContaining("Banco:Basa"),
      expect.stringContaining("Cta. Gs:2155009507"),
      expect.stringContaining("Cta. US$:12155002091"),
      expect.stringContaining("RUC:80132068-2"),
    ]);
  });

  it("copies one value with its own button", async () => {
    const writeText = mockClipboard();
    render(<PaymentDetails details={details} />);
    const row = screen.getAllByRole("listitem")[2] as HTMLElement;
    fireEvent.click(within(row).getByRole("button", { name: "Copiar Cta. Gs" }));
    expect(writeText).toHaveBeenCalledWith("2155009507");
    expect(await within(row).findByText("Copiado")).toBeInTheDocument();
  });

  it("copies all the details at once", () => {
    const writeText = mockClipboard();
    render(<PaymentDetails details={details} />);
    fireEvent.click(screen.getByRole("button", { name: "Copiar todos los datos" }));
    expect(writeText).toHaveBeenCalledWith(
      "Razón Social: SZUT EAS\nBanco: Basa\nCta. Gs: 2155009507\nCta. US$: 12155002091\nRUC: 80132068-2",
    );
  });

  it("says the details are coming when none were loaded", () => {
    render(<PaymentDetails details={null} />);
    expect(
      screen.getByText("Muy pronto vas a encontrar acá los datos bancarios."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});

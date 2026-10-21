const INTEGER = new Intl.NumberFormat("es-PY", { maximumFractionDigits: 0 });
const DECIMAL_2 = new Intl.NumberFormat("es-PY", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatInteger(value: number): string {
  return INTEGER.format(value);
}

/** Guaraníes: `₲ 2.518.000`. */
export function formatGs(value: number): string {
  const rounded = Math.round(value);
  const sign = rounded < 0 ? "-" : "";
  return `${sign}₲ ${INTEGER.format(Math.abs(rounded))}`;
}

/** US dollars: `US$ 123,74`. */
export function formatUsd(value: number): string {
  const sign = value < 0 ? "-" : "";
  return `${sign}US$ ${DECIMAL_2.format(Math.abs(value))}`;
}

/** ISO `yyyy-mm-dd` to `dd/mm/yyyy`. */
export function formatDate(iso: string): string {
  const [year, month, day] = iso.split("-");
  return `${day}/${month}/${year}`;
}

const INTEGER = new Intl.NumberFormat("es-PY", { maximumFractionDigits: 0 });

/** Guaraníes: `₲ 2.518.000` (non-breaking space so the symbol never wraps away from the amount). */
export function formatGs(value: number): string {
  return `₲ ${INTEGER.format(Math.round(value))}`;
}

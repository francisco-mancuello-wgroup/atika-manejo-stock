import { Button, Input } from "@atika/ui";
import { copiesField, type LabelVariant } from "../lib/labels/layout";
import { table } from "./styles";

/** Barcode per size and the "Imprimir etiquetas" form: copies per size (default = stock, 0 skips it). */
export function LabelPrinter({ productId, sizes }: { productId: string; sizes: LabelVariant[] }) {
  return (
    <section className="flex flex-col gap-4" aria-labelledby="labels-title">
      <div>
        <h2 id="labels-title" className="text-base font-medium">
          Etiquetas
        </h2>
        <p className="text-sm text-muted">
          Cada talle tiene su código de barras. Elegí cuántas copias imprimir de cada uno; con 0 no
          se imprime ese talle.
        </p>
      </div>
      <form
        method="get"
        action={`/inventario/${productId}/etiquetas`}
        className="flex flex-col gap-4"
      >
        <div className={table.wrapper}>
          <table className={table.root}>
            <thead className={table.head}>
              <tr>
                <th className={table.th}>Talle</th>
                <th className={table.th}>Código de barras</th>
                <th className={`${table.th} ${table.num}`}>Stock</th>
                <th className={`${table.th} ${table.num}`}>Copias</th>
              </tr>
            </thead>
            <tbody>
              {sizes.map(({ size, barcode, stock }) => (
                <tr key={size} className={table.row}>
                  <td className={table.td}>{size}</td>
                  <td className={`${table.td} font-mono`}>{barcode}</td>
                  <td className={`${table.td} ${table.num}`}>{stock}</td>
                  <td className={`${table.td} ${table.num}`}>
                    <Input
                      type="number"
                      name={copiesField(size)}
                      aria-label={`Copias talle ${size}`}
                      min={0}
                      step={1}
                      defaultValue={stock}
                      className="ml-auto h-8 w-24 text-right"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div>
          <Button type="submit">Imprimir etiquetas</Button>
        </div>
      </form>
    </section>
  );
}

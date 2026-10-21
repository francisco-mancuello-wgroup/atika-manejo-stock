import Link from "next/link";

export default function NotFound() {
  return (
    <section className="flex flex-col items-start gap-3">
      <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-muted">Error 404</p>
      <h1 className="font-display text-4xl text-ink">Página no encontrada</h1>
      <p className="text-sm text-muted">La dirección que abriste no existe en el panel.</p>
      <Link href="/" className="text-sm text-ink underline underline-offset-4">
        Volver al resumen
      </Link>
    </section>
  );
}

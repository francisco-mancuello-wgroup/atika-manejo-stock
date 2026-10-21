import Link from "next/link";

export default function NotFound() {
  return (
    <section className="mx-auto flex max-w-3xl flex-col items-start gap-3 px-6 py-16">
      <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-muted">Error 404</p>
      <h1 className="font-display text-5xl leading-tight text-ink">Página no encontrada</h1>
      <p className="text-sm text-muted">La prenda o sección que buscás no está disponible.</p>
      <Link href="/" className="text-sm text-ink underline underline-offset-4">
        Volver al inicio
      </Link>
    </section>
  );
}

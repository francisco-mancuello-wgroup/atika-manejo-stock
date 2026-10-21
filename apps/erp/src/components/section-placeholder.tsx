export function SectionPlaceholder({ title }: { title: string }) {
  return (
    <section className="flex flex-col gap-2">
      <h1 className="font-display text-4xl text-ink">{title}</h1>
      <p className="text-sm text-muted">Esta sección está en construcción.</p>
    </section>
  );
}

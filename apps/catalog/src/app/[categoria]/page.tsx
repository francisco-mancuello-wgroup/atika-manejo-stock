import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CATEGORIES, findCategory } from "../../lib/categories";

type Params = Promise<{ categoria: string }>;

export const dynamicParams = false;

export function generateStaticParams() {
  return CATEGORIES.map((category) => ({ categoria: category.slug }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const category = findCategory((await params).categoria);
  return { title: category ? `${category.label} · atika` : "atika" };
}

export default async function CategoryPage({ params }: { params: Params }) {
  const category = findCategory((await params).categoria);
  if (!category) notFound();

  return (
    <section className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="font-display text-5xl leading-tight text-ink">{category.label}</h1>
      <p className="mt-4 text-sm text-muted">Muy pronto vas a ver las prendas de esta categoría.</p>
    </section>
  );
}

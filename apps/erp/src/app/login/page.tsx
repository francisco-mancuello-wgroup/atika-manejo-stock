import { Wordmark } from "@atika/ui";
import { redirect } from "next/navigation";
import { LoginForm } from "../../components/login-form";
import { safeNextPath } from "../../lib/auth/next-path";
import { getSession } from "../../lib/auth/session";

export const dynamic = "force-dynamic";

export const metadata = { title: "atika · Ingresar" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const { next } = await searchParams;
  const target = safeNextPath(Array.isArray(next) ? next[0] : next);
  if (await getSession()) redirect(target);
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="flex w-full max-w-sm flex-col gap-8">
        <Wordmark className="h-8 self-start text-ink" />
        <h1 className="font-display text-3xl text-ink">Ingresar</h1>
        <LoginForm next={target === "/" ? undefined : target} />
      </div>
    </main>
  );
}

import { ChangePasswordForm } from "../../../components/change-password-form";
import { PageHeader } from "../../../components/page-header";
import { requireSession } from "../../../lib/auth/session";

export const dynamic = "force-dynamic";

export default async function SeguridadPage() {
  const session = await requireSession();
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Seguridad" description={`Sesión iniciada como ${session.email}.`} />
      <div className="max-w-md">
        <ChangePasswordForm />
      </div>
    </div>
  );
}

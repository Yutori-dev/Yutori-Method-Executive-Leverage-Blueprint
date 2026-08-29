import Link from "next/link";
import { getAdminUsers } from "@/lib/data/admins";
import { Container } from "@/components/ui/Container";
import { Card } from "@/components/ui/Card";
import { AddAdminForm } from "@/components/admin/AddAdminForm";

/** Self-service admin provisioning (brief section 3.1: "future
 * architecture should not make additional admin accounts difficult to
 * add") -- previously only possible via a local script with the service
 * role key. */
export default async function AdminUsersPage() {
  const admins = await getAdminUsers();

  return (
    <main className="py-16">
      <Container>
        <Link
          href="/admin"
          className="text-xs text-(--color-ink-muted) underline underline-offset-4 hover:text-(--color-ink)"
        >
          ← Back to sessions
        </Link>

        <h1 className="mt-4 font-serif text-3xl">Facilitator &amp; admin accounts</h1>
        <p className="mt-1 text-sm text-(--color-ink-muted)">
          Anyone added here can sign in at <code>/admin/login</code> with a passwordless magic
          link to their email — no password to set or share.
        </p>

        <Card className="mt-8">
          <AddAdminForm />
        </Card>

        <Card className="mt-6">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-(--color-hairline) text-xs tracking-wide text-(--color-ink-muted) uppercase">
                  <th className="pb-2 pr-4">Name</th>
                  <th className="pb-2 pr-4">Email</th>
                  <th className="pb-2">Added</th>
                </tr>
              </thead>
              <tbody>
                {admins.length > 0 ? (
                  admins.map((a) => (
                    <tr key={a.id} className="border-b border-(--color-hairline)/60">
                      <td className="py-2 pr-4">{a.displayName ?? "—"}</td>
                      <td className="py-2 pr-4 text-(--color-ink-muted)">{a.email}</td>
                      <td className="py-2 text-(--color-ink-muted)">{new Date(a.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="py-6 text-center text-(--color-ink-muted)">
                      No admins yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </Container>
    </main>
  );
}

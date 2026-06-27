import { AdminGrantAccess } from "@/components/admin-grant";
import { AdminStats } from "@/components/admin-stats";

export default function AdminPage() {
  return (
    <section className="content-page">
      <div className="eyebrow">Admin</div>
      <h1>Testzugänge</h1>
      <p className="lead">Vergib flexible Testzugänge und deaktiviere sie wieder, sobald ein Job erledigt ist.</p>
      <AdminGrantAccess />
      <AdminStats />
    </section>
  );
}

import { AdminGrantAccess } from "@/components/admin-grant";

export default function AdminPage() {
  return (
    <section className="content-page">
      <div className="eyebrow">Admin</div>
      <h1>Testzugänge</h1>
      <p className="lead">Vergib 1 Jahr kostenlosen Studio-Zugang an Testkunden.</p>
      <AdminGrantAccess />
    </section>
  );
}

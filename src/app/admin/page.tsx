import Link from "next/link";
import AdminDashboard from "@/components/admin/admin-dashboard";

export const metadata = {
  title: "Sari Admin",
};

export default function AdminPage() {
  return (
    <div>
      <AdminDashboard />
      <div className="max-w-6xl mx-auto px-6 pt-4 flex flex-wrap gap-3">
        <Link href="/admin/hq" className="inline-block px-4 py-2 rounded-xl bg-kawaii-purple text-white text-sm font-bold hover:opacity-90">
          📥 HQ: signups, purchases, letters, scams
        </Link>
        <Link href="/admin/scam-reports" className="inline-block px-4 py-2 rounded-xl bg-kawaii-purple text-white text-sm font-bold hover:opacity-90">
          🛡️ Review scam reports →
        </Link>
      </div>
    </div>
  );
}
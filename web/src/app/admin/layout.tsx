import { requireAdmin } from "@/lib/admin";
import { AdminSidebar } from "@/components/admin/AdminSidebar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 管理者認証チェック
  const admin = await requireAdmin();

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="flex">
        {/* サイドバー */}
        <AdminSidebar email={admin.email || ""} />

        {/* メインコンテンツ */}
        <main className="flex-1 ml-64 p-8">
          {children}
        </main>
      </div>
    </div>
  );
}

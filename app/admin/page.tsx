import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getAdminStats, getProducts, createProduct } from "@/app/actions/admin";
import { AdminDashboardClient } from "./client";
import { CopyButton } from "./CopyButton";
import { Key, ReactElement, JSXElementConstructor, ReactNode, ReactPortal } from "react";
export default async function AdminPage() {
  const session = await auth();

  if (session?.user?.role !== "ADMIN") { 
    redirect("/");
  }

  const stats = await getAdminStats();
  const products = await getProducts();

  return (
    <div className="min-h-screen bg-[#FDF2EC] p-8 font-[Outfit]">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-[#5B2D7D] mb-8">Admin Dashboard</h1>
        
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <StatCard title="Total Users" value={stats.userCount} />
          <StatCard title="Total Products" value={stats.productCount} />
          <StatCard title="Total Memories" value={stats.memoryCount} />
          <StatCard title="Storage Used" value={formatBytes(stats.totalStorage)} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Create Product Form */}
          <div className="lg:col-span-1">
             <div className="bg-white/40 backdrop-blur-xl rounded-[32px] shadow-sm p-6 border border-white/50">
                <h2 className="text-xl font-bold text-[#5B2D7D] mb-4">Create New Product</h2>
                <AdminDashboardClient />
             </div>
          </div>

          {/* User/Product List */}
          <div className="lg:col-span-2">
            <div className="bg-white/40 backdrop-blur-xl rounded-[32px] shadow-sm p-6 border border-white/50">
                <h2 className="text-xl font-bold text-[#5B2D7D] mb-4">Recent Products</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-[#5B2D7D]/10">
                        <th className="pb-3 font-medium text-[#5B2D7D]/60">Product Name</th>
                        <th className="pb-3 font-medium text-[#5B2D7D]/60">Assigned To</th>
                        <th className="pb-3 font-medium text-[#5B2D7D]/60">Token Link</th>
                        <th className="pb-3 font-medium text-[#5B2D7D]/60">Guest Link</th>
                        <th className="pb-3 font-medium text-[#5B2D7D]/60">Created</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {products.map((product: any) => (
                        <tr key={product.id} className="group hover:bg-white/50 transition-colors">
                          <td className="py-3 pr-4 text-[#5B2D7D]">{product.name}</td>
                          <td className="py-3 pr-4">
                            <div className="text-sm font-medium text-[#5B2D7D]">{product.user.name}</div>
                            <div className="text-xs text-[#5B2D7D]/60">{product.user.email}</div>
                          </td>
                          <td className="py-3 pr-4">
                            <div className="flex items-center gap-2">
                                <code className="font-mono text-xs text-[#5B2D7D]/80 truncate max-w-[150px] bg-white/50 px-2 py-1 rounded">
                                    /nfc/login?token={product.token}
                                </code>
                                <CopyButton token={product.token as string} />
                            </div>
                          </td>
                          <td className="py-3 pr-4">
                            <div className="flex items-center gap-2">
                                <code className="font-mono text-xs text-[#5B2D7D]/80 truncate max-w-[150px] bg-white/50 px-2 py-1 rounded">
                                    /guest/login?token={product.guestToken || "N/A"}
                                </code>
                                {product.guestToken && <CopyButton token={product.guestToken as string} isGuest />}
                            </div>
                          </td>
                          <td className="py-3 text-sm text-[#5B2D7D]/60">
                            {new Date(product.createdAt).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value }: { title: string; value: string | number }) {
  return (
    <div className="bg-white/40 backdrop-blur-xl rounded-2xl shadow-sm p-6 border border-white/50">
      <p className="text-sm font-medium text-[#5B2D7D]/60 mb-1">{title}</p>
      <p className="text-3xl font-bold text-[#5B2D7D]">{value}</p>
    </div>
  );
}

function formatBytes(bytes: number, decimals = 2) {
    if (!+bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

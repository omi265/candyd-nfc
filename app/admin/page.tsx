import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getAdminStats, getProducts, createProduct } from "@/app/actions/admin";
import { AdminDashboardClient } from "./client";
import { Key, ReactElement, JSXElementConstructor, ReactNode, ReactPortal } from "react";
export default async function AdminPage() {
  const session = await auth();

  if (session?.user?.role !== "ADMIN") { 
    redirect("/");
  }

  const stats = await getAdminStats();
  const products = await getProducts();

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Admin Dashboard</h1>
        
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
             <div className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-xl font-semibold mb-4">Create New Product</h2>
                <AdminDashboardClient />
             </div>
          </div>

          {/* User/Product List */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-xl font-semibold mb-4">Recent Products</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="pb-3 font-medium text-gray-500">Product Name</th>
                        <th className="pb-3 font-medium text-gray-500">Assigned To</th>
                        <th className="pb-3 font-medium text-gray-500">Token Link</th>
                        <th className="pb-3 font-medium text-gray-500">Created</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {products.map((product: { id: Key | null | undefined; name: string | number | bigint | boolean | ReactElement<unknown, string | JSXElementConstructor<any>> | Iterable<ReactNode> | ReactPortal | Promise<string | number | bigint | boolean | ReactPortal | ReactElement<unknown, string | JSXElementConstructor<any>> | Iterable<ReactNode> | null | undefined> | null | undefined; user: { name: string | number | bigint | boolean | ReactElement<unknown, string | JSXElementConstructor<any>> | Iterable<ReactNode> | ReactPortal | Promise<string | number | bigint | boolean | ReactPortal | ReactElement<unknown, string | JSXElementConstructor<any>> | Iterable<ReactNode> | null | undefined> | null | undefined; email: string | number | bigint | boolean | ReactElement<unknown, string | JSXElementConstructor<any>> | Iterable<ReactNode> | ReactPortal | Promise<string | number | bigint | boolean | ReactPortal | ReactElement<unknown, string | JSXElementConstructor<any>> | Iterable<ReactNode> | null | undefined> | null | undefined; }; token: string | number | bigint | boolean | ReactElement<unknown, string | JSXElementConstructor<any>> | Iterable<ReactNode> | ReactPortal | Promise<string | number | bigint | boolean | ReactPortal | ReactElement<unknown, string | JSXElementConstructor<any>> | Iterable<ReactNode> | null | undefined> | null | undefined; createdAt: string | number | Date; }) => (
                        <tr key={product.id} className="group hover:bg-gray-50">
                          <td className="py-3 pr-4">{product.name}</td>
                          <td className="py-3 pr-4">
                            <div className="text-sm font-medium text-gray-900">{product.user.name}</div>
                            <div className="text-xs text-gray-500">{product.user.email}</div>
                          </td>
                          <td className="py-3 pr-4 font-mono text-xs text-blue-600 truncate max-w-[200px]">
                            /nfc/login?token={product.token}
                          </td>
                          <td className="py-3 text-sm text-gray-500">
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
    <div className="bg-white rounded-xl shadow-sm p-6">
      <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
      <p className="text-3xl font-bold text-gray-900">{value}</p>
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

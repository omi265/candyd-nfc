import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getAdminStats, getProducts, getAllUsers } from "@/app/actions/admin";
import { getTickets } from "@/app/actions/support";
import { AdminDashboardClient } from "./client";
import { CopyButton } from "./CopyButton";
import { DeleteProductButton } from "./DeleteProductButton";
import { SupportTicketStatus } from "./SupportTicketStatus";
import { Product, SupportTicket } from "@prisma/client";

export default async function AdminPage() {
  const session = await auth();

  if (session?.user?.role !== "ADMIN") { 
    redirect("/");
  }

  const stats = await getAdminStats();
  const products = await getProducts();
  const users = await getAllUsers();
  const { tickets } = await getTickets();

  return (
    <div className="min-h-screen bg-transparent p-8 font-[Outfit]">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-[#5B2D7D] mb-8">Admin Dashboard</h1>
        
        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard title="Total Users" value={stats.userCount} />
          <StatCard title="Total Charms" value={stats.productCount} />
          <StatCard title="Unassigned" value={stats.productCount - stats.userCount} color="purple" />
          <StatCard title="Life Charms" value={stats.lifeCharmCount} color="green" />
          <StatCard title="Habit Charms" value={stats.habitCharmCount} color="orange" />
          <StatCard title="Memories" value={stats.memoryCount} />
          <StatCard title="Life Lists" value={stats.lifeListCount} />
          <StatCard title="Storage Used" value={formatBytes(stats.totalStorage)} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* Create Product Form */}
          <div className="lg:col-span-1">
             <div className="bg-white/40 backdrop-blur-xl rounded-[32px] shadow-sm p-6 border border-white/50 h-full">
                <h2 className="text-xl font-bold text-[#5B2D7D] mb-4">Create New Product</h2>
                <AdminDashboardClient users={users} />
             </div>
          </div>

          {/* User/Product List */}
          <div className="lg:col-span-2">
            <div className="bg-white/40 backdrop-blur-xl rounded-[32px] shadow-sm p-6 border border-white/50 h-full">
                <h2 className="text-xl font-bold text-[#5B2D7D] mb-4">Recent Products</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-[#5B2D7D]/10">
                        <th className="pb-3 font-medium text-[#5B2D7D]/60">Product Name</th>
                        <th className="pb-3 font-medium text-[#5B2D7D]/60">Type</th>
                        <th className="pb-3 font-medium text-[#5B2D7D]/60">Assigned To</th>
                        <th className="pb-3 font-medium text-[#5B2D7D]/60">Token Link</th>
                        <th className="pb-3 font-medium text-[#5B2D7D]/60 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {products.map((product: Product & { user: { email: string, name: string | null } | null }) => (
                        <tr key={product.id} className="group hover:bg-white/50 transition-colors">
                          <td className="py-3 pr-4 text-[#5B2D7D] font-medium">{product.name}</td>
                          <td className="py-3 pr-4">
                            <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              product.type === "LIFE"
                                ? "bg-[#A4C538]/20 text-[#7A9429]"
                                : product.type === "HABIT"
                                ? "bg-[#F37B55]/20 text-[#D45A35]"
                                : "bg-[#5B2D7D]/20 text-[#5B2D7D]"
                            }`}>
                              {product.type === "LIFE" ? "Life" : product.type === "HABIT" ? "Habit" : "Memory"}
                            </span>
                          </td>
                          <td className="py-3 pr-4">
                            {product.user ? (
                                <>
                                    <div className="text-sm font-medium text-[#5B2D7D]">{product.user.name}</div>
                                    <div className="text-xs text-[#5B2D7D]/60">{product.user.email}</div>
                                </>
                            ) : (
                                <span className="text-xs font-bold text-[#A4C538] bg-[#A4C538]/10 px-2 py-1 rounded-lg italic">Unassigned</span>
                            )}
                          </td>
                          <td className="py-3 pr-4">
                            <div className="flex items-center gap-2">
                                <code className="font-mono text-[10px] text-[#5B2D7D]/80 truncate max-w-[150px] bg-white/50 px-2 py-1 rounded border border-[#5B2D7D]/10">
                                    /nfc/login?token={product.token}
                                </code>
                                <CopyButton token={product.token as string} />
                            </div>
                          </td>
                          <td className="py-3 text-right">
                            <DeleteProductButton productId={product.id} productName={product.name} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
            </div>
          </div>
        </div>

        {/* Support Tickets Section */}
        <div className="bg-white/40 backdrop-blur-xl rounded-[32px] shadow-sm p-6 border border-white/50">
            <h2 className="text-xl font-bold text-[#5B2D7D] mb-4">Support Tickets</h2>
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead>
                        <tr className="border-b border-[#5B2D7D]/10">
                            <th className="pb-3 font-medium text-[#5B2D7D]/60">Date</th>
                            <th className="pb-3 font-medium text-[#5B2D7D]/60">Status</th>
                            <th className="pb-3 font-medium text-[#5B2D7D]/60">Subject</th>
                            <th className="pb-3 font-medium text-[#5B2D7D]/60">User / Email</th>
                            <th className="pb-3 font-medium text-[#5B2D7D]/60">Message</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {tickets?.map((ticket: SupportTicket & { user: { name: string | null, email: string } | null }) => (
                            <tr key={ticket.id} className="group hover:bg-white/50 transition-colors">
                                <td className="py-3 pr-4 text-sm text-[#5B2D7D]/60 whitespace-nowrap">
                                    {new Date(ticket.createdAt).toLocaleDateString()}
                                </td>
                                <td className="py-3 pr-4">
                                    <SupportTicketStatus 
                                        ticketId={ticket.id} 
                                        initialStatus={ticket.status} 
                                    />
                                </td>
                                <td className="py-3 pr-4 font-bold text-[#5B2D7D]">{ticket.subject}</td>
                                <td className="py-3 pr-4">
                                    <div className="text-sm font-medium text-[#5B2D7D]">{ticket.user?.name || "Guest"}</div>
                                    <div className="text-xs text-[#5B2D7D]/60">{ticket.email}</div>
                                </td>
                                <td className="py-3 pr-4 text-sm text-[#5B2D7D] max-w-md truncate">
                                    {ticket.message}
                                </td>
                            </tr>
                        ))}
                        {(!tickets || tickets.length === 0) && (
                            <tr>
                                <td colSpan={5} className="py-8 text-center text-[#5B2D7D]/40">No tickets found</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>

      </div>
    </div>
  );
}

function StatCard({ title, value, color }: { title: string; value: string | number; color?: "purple" | "green" | "orange" }) {
  const colorClasses = {
    purple: "text-[#5B2D7D]",
    green: "text-[#A4C538]",
    orange: "text-[#F37B55]",
  };
  return (
    <div className="bg-white/40 backdrop-blur-xl rounded-2xl shadow-sm p-4 border border-white/50">
      <p className="text-xs font-medium text-[#5B2D7D]/60 mb-1">{title}</p>
      <p className={`text-2xl font-bold ${color ? colorClasses[color] : "text-[#5B2D7D]"}`}>{value}</p>
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

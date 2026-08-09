"use client";

import { useState, useMemo } from "react";
import { Product } from "@prisma/client";
import { Search, Filter, ArrowUpDown, ArrowUp, ArrowDown, Trash2, ExternalLink } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { CopyButton } from "./CopyButton";
import { DeleteProductButton } from "./DeleteProductButton";
import { ProductComments } from "./ProductComments";

interface ProductTableClientProps {
    initialProducts: (Product & { user: { email: string, name: string | null } | null })[];
}

type SortConfig = {
    key: string;
    direction: 'asc' | 'desc' | null;
};

export function ProductTableClient({ initialProducts }: ProductTableClientProps) {
    const [search, setSearch] = useState("");
    const [typeFilter, setTypeFilter] = useState<string>("ALL");
    const [sort, setSort] = useState<SortConfig>({ key: 'createdAt', direction: 'desc' });

    const filteredAndSortedProducts = useMemo(() => {
        let result = [...initialProducts];

        // 1. Search
        if (search) {
            const lowSearch = search.toLowerCase();
            result = result.filter(p => 
                p.name.toLowerCase().includes(lowSearch) ||
                p.user?.email.toLowerCase().includes(lowSearch) ||
                p.user?.name?.toLowerCase().includes(lowSearch) ||
                p.comments?.toLowerCase().includes(lowSearch)
            );
        }

        // 2. Filter
        if (typeFilter !== "ALL") {
            result = result.filter(p => p.type === typeFilter);
        }

        // 3. Sort
        if (sort.key && sort.direction) {
            result.sort((a: any, b: any) => {
                let aVal = a[sort.key];
                let bVal = b[sort.key];

                // Handle nested user object for assignment sorting
                if (sort.key === 'user') {
                    aVal = a.user?.name || a.user?.email || "";
                    bVal = b.user?.name || b.user?.email || "";
                }

                if (aVal < bVal) return sort.direction === 'asc' ? -1 : 1;
                if (aVal > bVal) return sort.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }

        return result;
    }, [initialProducts, search, typeFilter, sort]);

    const toggleSort = (key: string) => {
        setSort(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    const SortIcon = ({ column }: { column: string }) => {
        if (sort.key !== column) return <ArrowUpDown className="w-3 h-3 ml-1 opacity-30" />;
        return sort.direction === 'asc' ? <ArrowUp className="w-3 h-3 ml-1" /> : <ArrowDown className="w-3 h-3 ml-1" />;
    };

    return (
        <div className="space-y-4">
            {/* Toolbar */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#556B5A]/40" />
                    <input 
                        type="text"
                        placeholder="Search products, users, or comments..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full bg-white/50 border border-[#556B5A]/10 rounded-xl pl-10 pr-4 py-2 text-sm text-[#556B5A] focus:outline-none focus:ring-2 focus:ring-[#556B5A]/20 transition-all"
                    />
                </div>
                <div className="flex items-center gap-2 w-full md:w-auto">
                    <Filter className="w-4 h-4 text-[#556B5A]/40" />
                    <select 
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value)}
                        className="bg-white/50 border border-[#556B5A]/10 rounded-xl px-3 py-2 text-sm text-[#556B5A] focus:outline-none focus:ring-2 focus:ring-[#556B5A]/20 transition-all cursor-pointer"
                    >
                        <option value="ALL">All Types</option>
                        <option value="MEMORY">Memory</option>
                        <option value="LIFE">Life</option>
                        <option value="HABIT">Habit</option>
                    </select>
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-[#556B5A]/10">
                            <th 
                                className="pb-3 font-medium text-[#556B5A]/60 cursor-pointer hover:text-[#556B5A] transition-colors"
                                onClick={() => toggleSort('name')}
                            >
                                <div className="flex items-center">Product Name <SortIcon column="name" /></div>
                            </th>
                            <th 
                                className="pb-3 font-medium text-[#556B5A]/60 cursor-pointer hover:text-[#556B5A] transition-colors"
                                onClick={() => toggleSort('type')}
                            >
                                <div className="flex items-center">Type <SortIcon column="type" /></div>
                            </th>
                            <th 
                                className="pb-3 font-medium text-[#556B5A]/60 cursor-pointer hover:text-[#556B5A] transition-colors"
                                onClick={() => toggleSort('user')}
                            >
                                <div className="flex items-center">Assigned To <SortIcon column="user" /></div>
                            </th>
                            <th className="pb-3 font-medium text-[#556B5A]/60">Comments</th>
                            <th className="pb-3 font-medium text-[#556B5A]/60">Token Link</th>
                            <th className="pb-3 font-medium text-[#556B5A]/60">Gifter Link</th>
                            <th className="pb-3 font-medium text-[#556B5A]/60 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        <AnimatePresence mode="popLayout">
                            {filteredAndSortedProducts.map((product) => (
                                <motion.tr 
                                    layout
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    key={product.id} 
                                    className="group hover:bg-white/50 transition-colors"
                                >
                                    <td className="py-3 pr-4 text-[#556B5A] font-medium">{product.name}</td>
                                    <td className="py-3 pr-4">
                                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                            product.type === "LIFE"
                                                ? "bg-[#7C9A86]/20 text-[#7A9429]"
                                                : product.type === "HABIT"
                                                ? "bg-[#F37B55]/20 text-[#D45A35]"
                                                : "bg-[#556B5A]/20 text-[#556B5A]"
                                        }`}>
                                            {product.type === "LIFE" ? "Life" : product.type === "HABIT" ? "Habit" : "Memory"}
                                        </span>
                                    </td>
                                    <td className="py-3 pr-4">
                                        {product.user ? (
                                            <>
                                                <div className="text-sm font-medium text-[#556B5A]">{product.user.name || "Unnamed"}</div>
                                                <div className="text-xs text-[#556B5A]/60">{product.user.email}</div>
                                            </>
                                        ) : (
                                            <span className="text-xs font-bold text-[#7C9A86] bg-[#7C9A86]/10 px-2 py-1 rounded-lg italic">Unassigned</span>
                                        )}
                                    </td>
                                    <td className="py-3 pr-4 min-w-[200px]">
                                        <ProductComments productId={product.id} initialComments={product.comments} />
                                    </td>
                                    <td className="py-3 pr-4">
                                        <div className="flex items-center gap-2">
                                            <code className="font-mono text-[10px] text-[#556B5A]/80 truncate max-w-[150px] bg-white/50 px-2 py-1 rounded border border-[#556B5A]/10">
                                                /nfc/login?token={product.token}
                                            </code>
                                            <CopyButton token={product.token as string} />
                                        </div>
                                    </td>
                                    <td className="py-3 pr-4">
                                        {product.type !== 'HABIT' && (
                                            <div className="flex items-center gap-2">
                                                <code className="font-mono text-[10px] text-[#7C9A86] truncate max-w-[150px] bg-white/50 px-2 py-1 rounded border border-[#7C9A86]/10">
                                                    /nfc/gifter-upload?token={product.token}
                                                </code>
                                                <CopyButton token={product.token as string} baseUrl="/nfc/gifter-upload?token=" />
                                            </div>
                                        )}
                                    </td>
                                    <td className="py-3 text-right">
                                        <DeleteProductButton productId={product.id} productName={product.name} />
                                    </td>
                                </motion.tr>
                            ))}
                        </AnimatePresence>
                        {filteredAndSortedProducts.length === 0 && (
                            <tr>
                                <td colSpan={6} className="py-12 text-center text-[#556B5A]/40">
                                    No products found matching your search.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

"use client";

import { useState, useTransition } from "react";
import { updateTicketStatus } from "@/app/actions/support";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { SupportStatus } from "@prisma/client";

interface SupportTicketStatusProps {
  ticketId: string;
  initialStatus: SupportStatus;
}

export function SupportTicketStatus({ ticketId, initialStatus }: SupportTicketStatusProps) {
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<SupportStatus>(initialStatus);

  const handleStatusChange = (newStatus: SupportStatus) => {
    if (newStatus === status) return;

    startTransition(async () => {
      const result = await updateTicketStatus(ticketId, newStatus);
      if (result.error) {
        toast.error(result.error);
        setStatus(status); // Revert on error
      } else {
        toast.success(`Ticket status updated to ${newStatus.replace('_', ' ')}`);
        setStatus(newStatus);
      }
    });
  };

  return (
    <div className="relative inline-block">
      <select
        value={status}
        disabled={isPending}
        onChange={(e) => handleStatusChange(e.target.value as SupportStatus)}
        className={`px-3 py-1 rounded-full text-xs font-bold uppercase outline-none transition-all appearance-none cursor-pointer pr-8 border-none ${
          status === 'OPEN' ? 'bg-red-100 text-red-700' :
          status === 'IN_PROGRESS' ? 'bg-yellow-100 text-yellow-700' :
          'bg-green-100 text-green-700'
        } ${isPending ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <option value="OPEN">Open</option>
        <option value="IN_PROGRESS">In Progress</option>
        <option value="CLOSED">Closed</option>
      </select>
      
      {isPending ? (
          <div className="absolute right-2 top-1/2 -translate-y-1/2">
              <Loader2 className="w-3 h-3 animate-spin text-[#5B2D7D]" />
          </div>
      ) : (
          <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
              <svg className="w-3 h-3 fill-current" viewBox="0 0 20 20">
                  <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
              </svg>
          </div>
      )}
    </div>
  );
}

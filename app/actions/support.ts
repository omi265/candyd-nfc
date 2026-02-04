"use server";

import { db } from "@/lib/db";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { SupportStatus } from "@prisma/client";

const createTicketSchema = z.object({
  subject: z.string().min(1, "Subject is required"),
  message: z.string().min(10, "Message is too short"),
  email: z.string().email().optional().or(z.literal("")),
});

export async function createTicket(data: z.infer<typeof createTicketSchema>) {
  const session = await auth();
  const validation = createTicketSchema.safeParse(data);
  
  if (!validation.success) {
      return { error: validation.error.issues[0].message };
  }

  try {
      await db.supportTicket.create({
          data: {
              subject: validation.data.subject,
              message: validation.data.message,
              email: (validation.data.email || session?.user?.email) || null,
              userId: session?.user?.id || null,
          }
      });
      return { success: true };
  } catch (error) {
      console.error("Support Create Error:", error);
      return { error: error instanceof Error ? error.message : "Failed to create ticket" };
  }
}

export async function getTickets() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
      return { error: "Unauthorized" };
  }

  try {
      const tickets = await db.supportTicket.findMany({
          orderBy: { createdAt: 'desc' },
          include: { user: { select: { name: true, email: true } } }
      });
      return { tickets };
  } catch (error) {
      return { error: "Failed to fetch tickets" };
  }
}

export async function updateTicketStatus(id: string, status: SupportStatus) {
    const session = await auth();
    if (session?.user?.role !== "ADMIN") return { error: "Unauthorized" };
    
    try {
        await db.supportTicket.update({
            where: { id },
            data: { status }
        });
        revalidatePath('/admin/support');
        revalidatePath('/admin');
        return { success: true };
    } catch (error) {
        return { error: "Failed to update" };
    }
}

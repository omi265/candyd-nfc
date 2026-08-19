import { auth } from "@/auth";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import JSZip from "jszip";

export async function GET() {
    const session = await auth();
    if (!session?.user?.id) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    try {
        const userId = session.user.id;

        // 1. Gather all data
        const user = await db.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                name: true,
                createdAt: true,
                contact: true,
                image: true,
            }
        });

        const memories = await db.memory.findMany({
            where: { userId },
            include: { media: true }
        });

        const habits = await db.habit.findMany({
            where: { userId },
            include: { logs: true }
        });

        const lifeLists = await db.lifeList.findMany({
            where: { userId },
            include: {
                items: {
                    include: {
                        experience: {
                            include: { media: true }
                        }
                    }
                }
            }
        });

        const people = await db.person.findMany({
            where: { userId }
        });

        const exportData = {
            metadata: {
                exportDate: new Date().toISOString(),
                version: "1.0",
                app: "Our Dve"
            },
            user,
            memories,
            habits,
            lifeLists,
            people
        };

        // 2. Create ZIP
        const zip = new JSZip();
        zip.file("data.json", JSON.stringify(exportData, null, 2));
        
        const readme = `
Our Dve Data Export
---------------------
Export Date: ${new Date().toLocaleString()}

This archive contains your digital life on Our Dve.
- data.json: Your profile, memories, habits, and life goals in a structured format.
- Media files are currently provided as direct links to Cloudinary within the JSON.

To view your photos and videos, simply open the links found in the "media" arrays throughout the JSON.

Thank you for being part of Our Dve.
`;
        zip.file("README.txt", readme);

        const content = await zip.generateAsync({ type: "blob" });

        // 3. Return as stream
        return new NextResponse(content, {
            status: 200,
            headers: {
                "Content-Type": "application/zip",
                "Content-Disposition": `attachment; filename="ourdve_export_${userId}.zip"`
            }
        });

    } catch (error) {
        console.error("Export error:", error);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}

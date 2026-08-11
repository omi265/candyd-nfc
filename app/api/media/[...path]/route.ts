import { NextRequest, NextResponse } from "next/server";
import { getS3ObjectStream } from "@/lib/storage";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { getMediaKind } from "@/lib/media-validation";
import { Readable } from "stream";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const session = await getSession();
    const { path } = await params;
    const fileKey = path.join("/");
    if (!fileKey.startsWith("uploads/") || path.some((segment) => segment === "..")) {
      return NextResponse.json({ error: "Invalid media path" }, { status: 400 });
    }

    const isAdmin = session?.user?.role === "ADMIN";
    const hasScopedOwnerAccess = Boolean(
      session?.user?.id && fileKey.startsWith(`uploads/users/${session.user.id}/`)
    );
    let hasRecordOwnerAccess = false;
    let isPublicShowcaseMedia = false;

    if (!isAdmin && !hasScopedOwnerAccess) {
      const storedPath = `/api/media/${fileKey}`;
      const urlFilter = {
        OR: [{ url: storedPath }, { url: { contains: fileKey } }],
      };

      const [memoryMedia, experienceMedia, habitLog, person] = await Promise.all([
        db.media.findFirst({
          where: urlFilter,
          include: {
            memory: {
              select: {
                userId: true,
                isLiked: true,
                product: { select: { active: true } },
              },
            },
          },
        }),
        db.experienceMedia.findFirst({
          where: urlFilter,
          include: {
            experience: {
              select: {
                isLiked: true,
                item: {
                  select: {
                    lifeList: {
                      select: {
                        userId: true,
                        product: { select: { active: true } },
                      },
                    },
                  },
                },
              },
            },
          },
        }),
        db.habitLog.findFirst({
          where: { imageUrl: { contains: fileKey } },
          include: { habit: { select: { userId: true } } },
        }),
        db.person.findFirst({
          where: { avatarUrl: { contains: fileKey } },
          select: { userId: true },
        }),
      ]);

      const ownerId = memoryMedia?.memory.userId ||
        experienceMedia?.experience.item.lifeList.userId ||
        habitLog?.habit.userId ||
        person?.userId;
      hasRecordOwnerAccess = Boolean(session?.user?.id && ownerId === session.user.id);
      isPublicShowcaseMedia = Boolean(
        (memoryMedia?.memory.isLiked && memoryMedia.memory.product?.active) ||
        (experienceMedia?.experience.isLiked && experienceMedia.experience.item.lifeList.product.active)
      );
    }

    if (!isAdmin && !hasScopedOwnerAccess && !hasRecordOwnerAccess && !isPublicShowcaseMedia) {
      return NextResponse.json({ error: session ? "Forbidden" : "Unauthorized" }, { status: session ? 403 : 401 });
    }

    const requestedRange = req.headers.get("range") || undefined;
    if (requestedRange && !/^bytes=\d*-\d*$/.test(requestedRange)) {
      return NextResponse.json({ error: "Invalid range" }, { status: 416 });
    }

    const { stream, contentType, contentLength, contentRange, acceptRanges } =
      await getS3ObjectStream(fileKey, requestedRange);
    if (!contentType || !getMediaKind(contentType)) {
      if (stream instanceof Readable) stream.destroy();
      return NextResponse.json({ error: "Unsupported stored media type" }, { status: 415 });
    }
    const responseHeaders = new Headers({
      "Content-Type": contentType || "application/octet-stream",
      "Cache-Control": "private, no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
      "Accept-Ranges": acceptRanges || "bytes",
    });
    if (contentLength !== undefined) responseHeaders.set("Content-Length", String(contentLength));
    if (contentRange) responseHeaders.set("Content-Range", contentRange);

    return new NextResponse(stream as unknown as BodyInit, {
      status: requestedRange ? 206 : 200,
      headers: responseHeaders,
    });
  } catch (error: unknown) {
    console.error("Media proxy stream error:", error);
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }
}
